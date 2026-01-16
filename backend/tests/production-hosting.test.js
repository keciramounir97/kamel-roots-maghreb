const request = require("supertest");
const fs = require("fs");
const os = require("os");
const path = require("path");

const createTempDist = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rootsmaghreb-dist-"));
  fs.writeFileSync(
    path.join(dir, "index.html"),
    "<!doctype html><html><head><title>RootsMaghreb</title></head><body>RootsMaghreb</body></html>",
    "utf8"
  );
  return dir;
};

describe("Production Hosting Simulation", () => {
  let distDir = null;

  beforeAll(() => {
    distDir = createTempDist();
  });

  afterAll(() => {
    if (distDir) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
  });

  it("Serves /health in production mode", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_DIST_DIR = distDir;
    jest.resetModules();
    const app = require("../server");
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  it("Serves SPA index for / in production when dist exists", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_DIST_DIR = distDir;
    jest.resetModules();
    const app = require("../server");
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("RootsMaghreb");
  });

  it("Serves static assets with correct MIME type in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_DIST_DIR = distDir;

    // Create a dummy JS file
    const assetsDir = path.join(distDir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, "test.js"),
      "console.log('ok');",
      "utf8"
    );

    jest.resetModules();
    const app = require("../server");
    const res = await request(app).get("/assets/test.js");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("javascript");
    expect(res.text).toBe("console.log('ok');");
  });

  it("Returns 404 for missing assets instead of falling back to HTML", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_DIST_DIR = distDir;
    jest.resetModules();
    const app = require("../server");

    const res = await request(app).get("/assets/missing-file.js");
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).not.toContain("text/html");
  });
});
