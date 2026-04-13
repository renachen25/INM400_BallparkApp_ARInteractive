/**
 * Exports the game finished screen (#device) as PNG to extract/game-finished.png
 * Run: node extract-game-finished.mjs  (requires: npx playwright install chromium)
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "extract");
const PORT = 9875;
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
    await page.goto(BASE + "game-finished.html", { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("#device");
    await new Promise((r) => setTimeout(r, 400));
    const path = join(OUT, "game-finished.png");
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
