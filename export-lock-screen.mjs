/**
 * Exports the lock screen (#device) as PNG (requires: npx playwright install chromium)
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "screenshots");
const PORT = 9877;
const BASE = `http://127.0.0.1:${PORT}/`;

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
      { cwd: __dirname, stdio: "ignore" }
    );
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 400);
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  try {
    await page.goto(BASE + "index.html", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("#device");
    await page.evaluate(() => {
      document.querySelectorAll(".screen").forEach((s) => {
        s.classList.toggle("active", s.id === "screen-lock");
      });
    });
    await new Promise((r) => setTimeout(r, 400));
    const path = join(OUT, "lock-screen.png");
    await page.locator("#device").screenshot({ path, type: "png" });
    console.log("Wrote", path);
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
