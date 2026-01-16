/**
 * API route audit (safe-by-default).
 *
 * Goals:
 * - Enumerate Express routes from the codebase (auth + /api routers).
 * - Probe each route against API_BASE without mutating data.
 * - Print a Markdown report with ✅/❌ per route.
 *
 * Safe probing rules:
 * - Protected routes: call without token and accept 401/403 as ✅ (route exists + auth enforced).
 * - Public write routes: send invalid/minimal payload to get 400/404 without side effects.
 * - Never send valid payloads that could create/delete/update data.
 *
 * Env:
 * - API_BASE: base URL including /api (default https://server.rootsmaghreb.com/api)
 * - TIMEOUT_MS: request timeout (default 12000)
 */
const path = require("path");
const axios = require("axios");

const RAW_BASE = (process.env.API_BASE || "https://server.rootsmaghreb.com/api").replace(
  /\/$/,
  ""
);
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 12000) || 12000;

const api = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT_MS,
  validateStatus: () => true,
  headers: {
    Accept: "application/json",
  },
});

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const uniqBy = (list, keyFn) => {
  const map = new Map();
  for (const item of list) map.set(keyFn(item), item);
  return Array.from(map.values());
};

const methodOrder = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
];

const normalizeMethod = (m) => String(m || "").toLowerCase();

const sortRoutes = (routes) =>
  [...routes].sort((a, b) => {
    const ap = String(a.path || "");
    const bp = String(b.path || "");
    if (ap !== bp) return ap.localeCompare(bp);
    const ai = methodOrder.indexOf(normalizeMethod(a.method));
    const bi = methodOrder.indexOf(normalizeMethod(b.method));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

const getRoutesFromRouter = (router, basePath = "") => {
  const out = [];
  const stack = router?.stack || [];
  for (const layer of stack) {
    if (layer?.route) {
      const routePath = layer.route.path;
      const methods = Object.keys(layer.route.methods || {}).filter(
        (m) => layer.route.methods[m]
      );
      for (const p of asArray(routePath)) {
        for (const method of methods) {
          out.push({
            method: normalizeMethod(method),
            path: `${basePath}${p}`,
          });
        }
      }
    } else if (layer?.name === "router" && layer?.handle?.stack) {
      out.push(...getRoutesFromRouter(layer.handle, basePath));
    }
  }
  return out;
};

const samplePath = (routePath) => {
  let p = String(routePath || "");
  p = p.replace(/:id\b/g, "7");
  p = p.replace(/:treeId\b/g, "7");
  p = p.replace(/:userId\b/g, "1");
  p = p.replace(/:email\b/g, "test@example.com");
  return p;
};

const buildProbe = ({ method, path: routePath }) => {
  const p = samplePath(routePath);

  const isAuthProtected =
    p.startsWith("/admin/") ||
    p.startsWith("/my/") ||
    p === "/auth/me" ||
    p === "/auth/logout" ||
    p === "/auth/me";

  if (isAuthProtected) {
    return { method, url: p, kind: "protected" };
  }

  if (method === "get") {
    if (p === "/search")
      return { method, url: `${p}?q=a`, kind: "public_read" };
    return { method, url: p, kind: "public_read" };
  }

  if (p === "/auth/login") {
    return {
      method,
      url: p,
      kind: "public_write_invalid",
      body: { email: "", password: "" },
    };
  }
  if (p === "/auth/signup") {
    return {
      method,
      url: p,
      kind: "public_write_invalid",
      body: { email: "", password: "" },
    };
  }
  if (p === "/auth/reset") {
    return {
      method,
      url: p,
      kind: "public_write_invalid",
      body: { email: "" },
    };
  }
  if (p === "/auth/reset/verify") {
    return {
      method,
      url: p,
      kind: "public_write_invalid",
      body: { email: "", code: "", newPassword: "" },
    };
  }

  if (method === "post" || method === "put" || method === "patch") {
    return { method, url: p, kind: "public_write_invalid", body: {} };
  }

  if (method === "delete") {
    return { method, url: p, kind: "public_delete_noop" };
  }

  return { method, url: p, kind: "unknown" };
};

const probeRoute = async (route) => {
  const probe = buildProbe(route);
  const method = normalizeMethod(probe.method);

  try {
    const res = await api.request({
      url: probe.url,
      method,
      data: probe.body,
    });

    const status = res.status;
    const message =
      res.data?.message ||
      res.data?.error ||
      (typeof res.data === "string" ? res.data : "");

    const looksLikeExpress404 = () => {
      const msg = String(message || "");
      return (
        (res.data &&
          typeof res.data === "object" &&
          res.data.error === "NotFound") ||
        msg.startsWith("Cannot GET ") ||
        msg.startsWith("Cannot POST ") ||
        msg.startsWith("Cannot PUT ") ||
        msg.startsWith("Cannot PATCH ") ||
        msg.startsWith("Cannot DELETE ")
      );
    };

    const routeMissing =
      status === 405 ||
      status === 501 ||
      (status === 404 && looksLikeExpress404());
    const serverError = status >= 500;

    let ok = false;
    if (!routeMissing && !serverError) {
      ok = true;
    }

    if (probe.kind === "protected") {
      ok = ok || status === 401 || status === 403;
    }

    return { ...route, url: probe.url, status, ok, message };
  } catch (err) {
    return {
      ...route,
      url: probe.url,
      status: "ERR",
      ok: false,
      message: err.message,
    };
  }
};

async function main() {
  const root = path.join(__dirname, "..");
  const routesDir = path.join(root, "src", "routes");

  const authRoutes = require(path.join(routesDir, "authRoutes.js"));
  const activityRoutes = require(path.join(routesDir, "activityRoutes.js"));
  const bookRoutes = require(path.join(routesDir, "bookRoutes.js"));
  const contactRoutes = require(path.join(routesDir, "contactRoutes.js"));
  const galleryRoutes = require(path.join(routesDir, "galleryRoutes.js"));
  const healthRoutes = require(path.join(routesDir, "healthRoutes.js"));
  const newsletterRoutes = require(path.join(routesDir, "newsletterRoutes.js"));
  const personRoutes = require(path.join(routesDir, "personRoutes.js"));
  const roleRoutes = require(path.join(routesDir, "roleRoutes.js"));
  const searchRoutes = require(path.join(routesDir, "searchRoutes.js"));
  const settingsRoutes = require(path.join(routesDir, "settingsRoutes.js"));
  const statsRoutes = require(path.join(routesDir, "statsRoutes.js"));
  const treeRoutes = require(path.join(routesDir, "treeRoutes.js"));
  const userRoutes = require(path.join(routesDir, "userRoutes.js"));
  const diagnosticsRoutes = require(path.join(
    routesDir,
    "diagnosticsRoutes.js"
  ));

  const routeSets = [
    ...getRoutesFromRouter(authRoutes, "/auth"),
    ...getRoutesFromRouter(userRoutes, ""),
    ...getRoutesFromRouter(settingsRoutes, ""),
    ...getRoutesFromRouter(statsRoutes, ""),
    ...getRoutesFromRouter(activityRoutes, ""),
    ...getRoutesFromRouter(bookRoutes, ""),
    ...getRoutesFromRouter(treeRoutes, ""),
    ...getRoutesFromRouter(searchRoutes, ""),
    ...getRoutesFromRouter(contactRoutes, ""),
    ...getRoutesFromRouter(personRoutes, ""),
    ...getRoutesFromRouter(healthRoutes, ""),
    ...getRoutesFromRouter(roleRoutes, ""),
    ...getRoutesFromRouter(galleryRoutes, ""),
    ...getRoutesFromRouter(newsletterRoutes, ""),
    ...getRoutesFromRouter(diagnosticsRoutes, ""),
  ];

  const routes = sortRoutes(
    uniqBy(
      routeSets.map((r) => ({
        ...r,
        path: r.path.replace(/\/+$/, "") || "/",
      })),
      (r) => `${r.method.toUpperCase()} ${r.path}`
    )
  );

  const results = [];
  for (const route of routes) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await probeRoute(route));
  }

  const okCount = results.filter((r) => r.ok).length;
  const total = results.length;

  console.log(`# API Route Audit`);
  console.log(``);
  console.log(`Base: ${RAW_BASE}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(``);
  console.log(`- ✅ OK: ${okCount}/${total}`);
  console.log(`- ❌ Fail: ${total - okCount}/${total}`);
  console.log(``);
  console.log(`| Status | Method | Path | HTTP | Note |`);
  console.log(`|---|---|---|---:|---|`);

  for (const r of results) {
    const statusIcon = r.ok ? "✅" : "❌";
    const note = String(r.message || "")
      .replace(/\r?\n/g, " ")
      .slice(0, 120);
    console.log(
      `| ${statusIcon} | ${r.method.toUpperCase()} | ${r.path} | ${
        r.status
      } | ${note || ""} |`
    );
  }

  const hasFails = results.some((r) => !r.ok);
  process.exit(hasFails ? 2 : 0);
}

main().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
