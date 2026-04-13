/**
 * Exports: home, game (30s/$0, 20s), game finished (Playwright + local server).
 * Run: node extract-three-states.mjs  (requires: npx playwright install chromium)
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "extract");
const PORT = 9878;
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

async function showScreen(page, id) {
  await page.evaluate((screenId) => {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.toggle("active", s.id === screenId);
    });
  }, id);
}

function setupGameInProgress(page, secondsLeft, moneyStr, spots) {
  return async () => {
    await page.evaluate(
      ({ secondsLeft: sec, moneyStr: money, spots: ballSpots }) => {
        var BALL_IMG =
          "assets/images/pngtree-baseball-isolated-on-white-background-png-image_13082814.png";
        var TD_LOGO = "assets/images/TD_Bank_logo_PNG1.png";
        function formatTime(s) {
          var m = Math.floor(s / 60);
          var r = s % 60;
          return m + ":" + (r < 10 ? "0" : "") + r;
        }
        var o = document.getElementById("tap-hint-overlay");
        if (o) o.classList.add("hidden");
        var statTime = document.getElementById("stat-time");
        var statMoney = document.getElementById("stat-money");
        if (statTime) {
          statTime.textContent = formatTime(sec);
          statTime.classList.toggle("low", sec <= 10);
        }
        if (statMoney) statMoney.textContent = money;
        var playfield = document.getElementById("playfield");
        if (!playfield) return;
        playfield.innerHTML = "";
        ballSpots.forEach(function (p, i) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "baseball";
          btn.dataset.id = String(i + 1);
          btn.setAttribute("aria-label", "Catch baseball");
          btn.style.left = p.left + "px";
          btn.style.top = p.top + "px";
          btn.style.animationDuration = 1.35 + i * 0.12 + "s";
          btn.style.animationDelay = i * 0.04 + "s";
          var wrap = document.createElement("div");
          wrap.className = "ball-wrap";
          var img = document.createElement("img");
          img.src = BALL_IMG;
          img.className = "ball-gfx";
          img.setAttribute("aria-hidden", "true");
          img.setAttribute("draggable", "false");
          var td = document.createElement("img");
          td.src = TD_LOGO;
          td.className = "ball-sponsor";
          td.setAttribute("aria-hidden", "true");
          td.setAttribute("draggable", "false");
          wrap.appendChild(img);
          wrap.appendChild(td);
          btn.appendChild(wrap);
          playfield.appendChild(btn);
        });
      },
      { secondsLeft, moneyStr, spots }
    );
  };
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
    await page.goto(BASE + "index.html", { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("#device");

    const shots = [
      { file: "01-home.png", screen: "screen-home" },
      {
        file: "02-game-30s-0.png",
        screen: "screen-game",
        waitMs: 400,
        setup: setupGameInProgress(page, 30, "$0.00", []),
      },
      {
        file: "03-game-20s.png",
        screen: "screen-game",
        waitMs: 2600,
        setup: setupGameInProgress(page, 20, "$0.00", [
          { left: 28, top: 80 },
          { left: 210, top: 140 },
          { left: 80, top: 240 },
        ]),
      },
      {
        file: "04-game-finished.png",
        screen: "screen-done",
        waitMs: 300,
        setup: async () => {
          await page.evaluate(() => {
            var el = document.getElementById("done-you");
            if (el) el.textContent = "You raised: $12.00";
          });
        },
      },
    ];

    for (const shot of shots) {
      await showScreen(page, shot.screen);
      if (shot.setup) await shot.setup();
      await new Promise(function (r) {
        setTimeout(r, shot.waitMs ?? 300);
      });
      const path = join(OUT, shot.file);
      await page.locator("#device").screenshot({ path, type: "png" });
      console.log("Wrote", path);
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
