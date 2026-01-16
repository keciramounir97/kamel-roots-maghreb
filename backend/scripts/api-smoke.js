/* Minimal smoke tester that pings key API endpoints and logs pass/fail */
const axios = require("axios").create({
  baseURL: (process.env.API_BASE || "http://localhost:5000/api").replace(/\/$/, ""),
  validateStatus: () => true,
  timeout: 5000,
});

const tests = [
  { name: "Health", run: () => axios.get("/health") },
  { name: "Search", run: () => axios.get("/search?q=a") },
  { name: "Suggest", run: () => axios.get("/search/suggest?q=a") },
  { name: "Public books", run: () => axios.get("/books") },
  { name: "Public trees", run: () => axios.get("/trees") },
];

async function main() {
  const results = [];
  for (const t of tests) {
    try {
      const res = await t.run();
      results.push({ name: t.name, status: res.status, ok: res.status < 400 });
    } catch (err) {
      results.push({
        name: t.name,
        ok: false,
        status: err.response?.status || "ERR",
        message: err.response?.data || err.message,
      });
    }
  }

  console.log("Smoke results:");
  results.forEach((r) =>
    console.log(
      `${r.ok ? "✅" : "❌"} ${r.name} -> ${r.status}${
        r.ok ? "" : ` (${JSON.stringify(r.message)})`
      }`
    )
  );
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main();
