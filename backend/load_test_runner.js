const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

// Configuration
const TARGET_URL = "http://localhost:5000";
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 500;
const ENDPOINTS = [
  "/api/health",
  "/api/search?q=history",
  "/api/books",
  "/api/trees",
];

async function startServer() {
  console.log("Starting backend server for testing...");
  return new Promise((resolve, reject) => {
    const serverProcess = spawn("node", ["server.js"], {
      cwd: path.join(__dirname),
      env: { ...process.env, PORT: 5000, NODE_ENV: "test" },
      stdio: "pipe",
    });

    let started = false;

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[Server]: ${output.trim()}`);
      if (output.includes("Server running") && !started) {
        started = true;
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server Error]: ${data.toString()}`);
    });

    serverProcess.on("close", (code) => {
      if (!started) {
        reject(new Error(`Server exited with code ${code} before starting`));
      }
    });
  });
}

function makeRequest(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    http
      .get(`${TARGET_URL}${path}`, (res) => {
        res.resume(); // Consume response
        res.on("end", () => {
          resolve({
            path,
            status: res.statusCode,
            duration: Date.now() - start,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        });
      })
      .on("error", (err) => {
        resolve({
          path,
          status: 0,
          duration: Date.now() - start,
          success: false,
          error: err.message,
        });
      });
  });
}

const fs = require("fs");

async function runLoadTest(serverProcess) {
  console.log(`\n--- Starting Load Test ---`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);

  const results = [];
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS);

  const startTime = Date.now();

  for (let i = 0; i < batches; i++) {
    const promises = [];
    const batchSize = Math.min(
      CONCURRENT_REQUESTS,
      TOTAL_REQUESTS - i * CONCURRENT_REQUESTS
    );

    console.log(`Running batch ${i + 1}/${batches} (${batchSize} requests)...`);

    for (let j = 0; j < batchSize; j++) {
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      promises.push(makeRequest(endpoint));
    }

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  const totalTime = Date.now() - startTime;

  // Analysis
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const avgDuration =
    results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map((r) => r.duration));
  const reqPerSec = (results.length / (totalTime / 1000)).toFixed(2);

  const report = `
--- Load Test Results ---
Total Duration: ${(totalTime / 1000).toFixed(2)}s
Throughput: ${reqPerSec} req/sec
Total Requests: ${results.length}
Successful: ${successful.length}
Failed: ${failed.length}
Avg Latency: ${avgDuration.toFixed(2)}ms
Max Latency: ${maxDuration}ms
`;

  console.log(report);
  fs.writeFileSync("backend/load_test_results.txt", report);

  if (failed.length > 0) {
    const errorLog =
      "\nSample Errors:\n" +
      failed
        .slice(0, 5)
        .map((f) => `- ${f.path}: ${f.error || "Status " + f.status}`)
        .join("\n");
    console.log(errorLog);
    fs.appendFileSync("backend/load_test_results.txt", errorLog);
  }

  serverProcess.kill();
  process.exit(failed.length > 0 ? 1 : 0);
}

// Main execution
(async () => {
  try {
    const server = await startServer();
    // Give it a moment to settle
    await new Promise((r) => setTimeout(r, 2000));
    await runLoadTest(server);
  } catch (err) {
    console.error("Test Failed:", err.message);
    process.exit(1);
  }
})();
