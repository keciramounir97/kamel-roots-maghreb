/**
 * Full API smoke harness.
 * - Target base URL: API_BASE (default http://localhost:5000/api)
 * - For admin routes, provide ADMIN_TOKEN or ADMIN_EMAIL/ADMIN_PASSWORD (seed admin) to login.
 * - Creates a temp user for signup/login/reset flows to avoid touching real data.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const axiosBase = require("axios");
const crypto = require("crypto");

const BASE = (process.env.API_BASE || "http://localhost:5000/api").replace(
  /\/$/,
  ""
);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const SMOKE_WRITE =
  String(process.env.SMOKE_WRITE || "").toLowerCase() === "true";

const api = axiosBase.create({
  baseURL: BASE,
  timeout: 8000,
  validateStatus: () => true,
});

const fs = require("fs");

async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.status < 400 ? res.data.token : null;
}

const resolveFirstExistingFile = (candidates) => {
  for (const filePath of candidates) {
    try {
      if (filePath && fs.existsSync(filePath)) return filePath;
    } catch {}
  }
  return null;
};

const pickFileFromDir = (dirPath, extensions) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      const ext = path.extname(name).toLowerCase().slice(1);
      if (!extensions || !extensions.length || extensions.includes(ext)) {
        return path.join(dirPath, name);
      }
    }
  } catch {}
  return null;
};

const fetchJson = async (
  url,
  { method = "GET", token, body, headers } = {}
) => {
  const mergedHeaders = { ...(headers || {}) };
  if (token) mergedHeaders.Authorization = `Bearer ${token}`;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers: mergedHeaders,
    body:
      body && typeof body === "object" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }
  return { status: res.status, ok: res.ok, data };
};

async function smokeAuth() {
  const email = `smoke_${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = "SmokePass123!";
  const results = [];
  let resetCode = null;

  // Signup
  const signupRes = await api.post("/auth/signup", {
    fullName: "Smoke Test",
    phone: "+10000000000",
    email,
    password,
  });
  results.push({
    name: "auth.signup",
    status: signupRes.status,
    ok: signupRes.status < 400,
  });

  // Login
  const loginRes = await api.post("/auth/login", { email, password });
  const token = loginRes.data?.token;
  results.push({ name: "auth.login", status: loginRes.status, ok: !!token });

  // Me
  const meRes = await api.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  results.push({
    name: "auth.me",
    status: meRes.status,
    ok: meRes.status < 400,
  });

  // Reset request
  const resetReq = await api.post(
    "/auth/reset",
    { email },
    { headers: { "x-echo-reset-code": "true" } }
  );
  results.push({
    name: "auth.reset.request",
    status: resetReq.status,
    ok: resetReq.status < 400,
  });
  if (resetReq.data && resetReq.data.code) {
    resetCode = resetReq.data.code;
  }

  if (resetCode) {
    const resetVerify = await api.post("/auth/reset/verify", {
      email,
      code: resetCode,
      newPassword: "SmokePass456!",
    });
    results.push({
      name: "auth.reset.verify",
      status: resetVerify.status,
      ok: resetVerify.status < 400,
    });
  } else {
    results.push({
      name: "auth.reset.verify",
      status: "SKIP",
      ok: false,
      message: "Code email not captured in smoke",
    });
  }

  return results;
}

async function smokePublic() {
  const resHealth = await api.get("/health");
  const resBooks = await api.get("/books");
  const resTrees = await api.get("/trees");
  const resGallery = await api.get("/gallery");
  const resSearch = await api.get("/search?q=a");
  return [
    { name: "health", status: resHealth.status, ok: resHealth.status < 400 },
    {
      name: "books.public",
      status: resBooks.status,
      ok: resBooks.status < 400,
    },
    {
      name: "trees.public",
      status: resTrees.status,
      ok: resTrees.status < 400,
    },
    {
      name: "gallery.public",
      status: resGallery.status,
      ok: resGallery.status < 400,
    },
    { name: "search", status: resSearch.status, ok: resSearch.status < 400 },
  ];
}

async function getAdminToken() {
  let adminToken = ADMIN_TOKEN;
  const adminEmail = ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const adminPassword = ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (!adminToken && adminEmail && adminPassword) {
    adminToken = await login(adminEmail, adminPassword);
  }
  return adminToken || null;
}

async function smokeGallery(token) {
  const results = [];
  const authHeader = { Authorization: `Bearer ${token}` };

  const readRequests = [
    { name: "gallery.admin.list", method: "get", url: "/admin/gallery" },
    { name: "gallery.my.list", method: "get", url: "/my/gallery" },
    { name: "gallery.public.list", method: "get", url: "/gallery" },
  ];

  for (const req of readRequests) {
    const res = await api({
      url: req.url,
      method: req.method,
      headers: authHeader,
    });
    results.push({ name: req.name, status: res.status, ok: res.status < 400 });
  }

  if (!SMOKE_WRITE) return results;

  if (typeof FormData !== "function" || typeof Blob !== "function") {
    results.push({
      name: "gallery.write",
      status: "SKIP",
      ok: false,
      message: "Node FormData/Blob not available (need Node 18+).",
    });
    return results;
  }

  const apiBaseRoot = BASE.replace(/\/api$/, "");
  const imageDir = path.join(__dirname, "..", "uploads", "gallery");
  const fallbackImageDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "public"
  );
  const imagePath =
    pickFileFromDir(imageDir, ["png", "jpg", "jpeg", "webp", "gif"]) ||
    pickFileFromDir(fallbackImageDir, ["png", "jpg", "jpeg", "webp", "gif"]);

  if (!imagePath) {
    results.push({
      name: "gallery.write",
      status: "SKIP",
      ok: false,
      message: "No sample image file found for multipart upload.",
    });
    return results;
  }

  const createForm = new FormData();
  createForm.append("title", `Smoke Gallery ${Date.now()}`);
  createForm.append("isPublic", "true");
  createForm.append(
    "image",
    new Blob([fs.readFileSync(imagePath)]),
    path.basename(imagePath)
  );

  const createRes = await fetchJson(`${apiBaseRoot}/api/admin/gallery`, {
    method: "POST",
    token,
    body: createForm,
  });
  results.push({
    name: "gallery.admin.create",
    status: createRes.status,
    ok: createRes.status < 400,
  });

  const createdId = createRes?.data?.item?.id;
  if (!createdId) return results;

  const updateForm = new FormData();
  updateForm.append("title", `Smoke Gallery Updated ${Date.now()}`);
  updateForm.append("isPublic", "true");

  const updateRes = await fetchJson(
    `${apiBaseRoot}/api/admin/gallery/${createdId}`,
    { method: "PUT", token, body: updateForm }
  );
  results.push({
    name: "gallery.admin.update",
    status: updateRes.status,
    ok: updateRes.status < 400,
  });

  const delRes = await fetchJson(
    `${apiBaseRoot}/api/admin/gallery/${createdId}`,
    {
      method: "DELETE",
      token,
    }
  );
  results.push({
    name: "gallery.admin.delete",
    status: delRes.status,
    ok: delRes.status < 400,
  });

  return results;
}

async function smokeTrees(token) {
  const results = [];
  const authHeader = { Authorization: `Bearer ${token}` };

  const listRes = await api.get("/my/trees", { headers: authHeader });
  results.push({
    name: "trees.my.list",
    status: listRes.status,
    ok: listRes.status < 400,
  });

  if (!SMOKE_WRITE) return results;

  if (typeof FormData !== "function" || typeof Blob !== "function") {
    results.push({
      name: "trees.write",
      status: "SKIP",
      ok: false,
      message: "Node FormData/Blob not available (need Node 18+).",
    });
    return results;
  }

  const apiBaseRoot = BASE.replace(/\/api$/, "");
  const gedcomPath =
    resolveFirstExistingFile([
      path.join(__dirname, "..", "..", "sample-family-tree.ged"),
      path.join(__dirname, "..", "..", "a.ged"),
    ]) ||
    pickFileFromDir(path.join(__dirname, "..", "uploads", "trees"), ["ged"]);

  const createForm = new FormData();
  createForm.append("title", `Smoke Tree ${Date.now()}`);
  createForm.append("description", "Smoke tree create");
  createForm.append("isPublic", "false");
  if (gedcomPath) {
    createForm.append(
      "file",
      new Blob([fs.readFileSync(gedcomPath)], { type: "text/plain" }),
      path.basename(gedcomPath)
    );
  }

  const createRes = await fetchJson(`${apiBaseRoot}/api/my/trees`, {
    method: "POST",
    token,
    body: createForm,
  });
  results.push({
    name: "trees.my.create",
    status: createRes.status,
    ok: createRes.status < 400,
  });

  const createdId = createRes?.data?.id;
  if (!createdId) return results;

  const updateForm = new FormData();
  updateForm.append("title", `Smoke Tree Updated ${Date.now()}`);
  updateForm.append("description", "Smoke tree update");
  updateForm.append("isPublic", "false");
  const updateRes = await fetchJson(
    `${apiBaseRoot}/api/my/trees/${createdId}`,
    {
      method: "PUT",
      token,
      body: updateForm,
    }
  );
  results.push({
    name: "trees.my.update",
    status: updateRes.status,
    ok: updateRes.status < 400,
  });

  const delRes = await fetchJson(`${apiBaseRoot}/api/my/trees/${createdId}`, {
    method: "DELETE",
    token,
  });
  results.push({
    name: "trees.my.delete",
    status: delRes.status,
    ok: delRes.status < 400,
  });

  return results;
}

async function smokeBooks(token) {
  const results = [];
  const authHeader = { Authorization: `Bearer ${token}` };

  const listRes = await api.get("/admin/books", { headers: authHeader });
  results.push({
    name: "books.admin.list",
    status: listRes.status,
    ok: listRes.status < 400,
  });

  if (!SMOKE_WRITE) return results;

  if (typeof FormData !== "function" || typeof Blob !== "function") {
    results.push({
      name: "books.write",
      status: "SKIP",
      ok: false,
      message: "Node FormData/Blob not available (need Node 18+).",
    });
    return results;
  }

  const apiBaseRoot = BASE.replace(/\/api$/, "");
  const booksDir = path.join(__dirname, "..", "uploads", "books");
  const bookFile =
    pickFileFromDir(booksDir, ["pdf", "doc", "docx", "txt", "epub", "mobi"]) ||
    pickFileFromDir(booksDir, ["png", "jpg", "jpeg", "webp"]);
  const coverFile = pickFileFromDir(booksDir, [
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
  ]);

  if (!bookFile || !coverFile) {
    results.push({
      name: "books.write",
      status: "SKIP",
      ok: false,
      message: "No sample book/cover files found in backend/uploads/books.",
    });
    return results;
  }

  const createForm = new FormData();
  createForm.append("title", `Smoke Book ${Date.now()}`);
  createForm.append("author", "Smoke");
  createForm.append("category", "Smoke");
  createForm.append("description", "Smoke upload");
  createForm.append("isPublic", "false");
  createForm.append(
    "file",
    new Blob([fs.readFileSync(bookFile)]),
    path.basename(bookFile)
  );
  createForm.append(
    "cover",
    new Blob([fs.readFileSync(coverFile)]),
    path.basename(coverFile)
  );

  const createRes = await fetchJson(`${apiBaseRoot}/api/admin/books`, {
    method: "POST",
    token,
    body: createForm,
  });
  results.push({
    name: "books.admin.create",
    status: createRes.status,
    ok: createRes.status < 400,
  });

  const createdId = createRes?.data?.id;
  if (!createdId) return results;

  const delRes = await fetchJson(
    `${apiBaseRoot}/api/admin/books/${createdId}`,
    {
      method: "DELETE",
      token,
    }
  );
  results.push({
    name: "books.admin.delete",
    status: delRes.status,
    ok: delRes.status < 400,
  });

  return results;
}

async function smokeAdmin() {
  const results = [];
  const adminToken = await getAdminToken();
  if (!adminToken) {
    return [
      {
        name: "admin",
        status: "SKIP",
        ok: false,
        message: "Missing ADMIN_TOKEN or ADMIN_EMAIL/ADMIN_PASSWORD",
      },
    ];
  }

  const authHeader = { Authorization: `Bearer ${adminToken}` };
  const adminRequests = [
    { name: "admin.users", method: "get", url: "/admin/users" },
    { name: "admin.roles", method: "get", url: "/admin/roles" },
    { name: "admin.stats", method: "get", url: "/admin/stats" },
    { name: "admin.activity", method: "get", url: "/admin/activity" },
    { name: "admin.books", method: "get", url: "/admin/books" },
    { name: "admin.trees", method: "get", url: "/admin/trees" },
    { name: "admin.settings", method: "get", url: "/admin/settings" },
  ];

  for (const req of adminRequests) {
    const res = await api({
      url: req.url,
      method: req.method,
      headers: authHeader,
    });
    results.push({ name: req.name, status: res.status, ok: res.status < 400 });
  }

  results.push(...(await smokeBooks(adminToken)));
  results.push(...(await smokeTrees(adminToken)));
  results.push(...(await smokeGallery(adminToken)));

  return results;
}

async function main() {
  const results = [
    ...(await smokePublic()),
    ...(await smokeAuth()),
    ...(await smokeAdmin()),
  ];

  console.log("Full smoke results:");
  results.forEach((r) =>
    console.log(
      `${r.ok ? "✅" : "❌"} ${r.name} -> ${r.status}${
        r.message ? ` (${r.message})` : ""
      }`
    )
  );
  const failed = results.filter((r) => !r.ok && r.status !== "SKIP");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke failed:", err.message);
  process.exit(1);
});
