(function () {
  var DURATION_SEC = 30;
  var START_MONEY = 0;
  var PER_CATCH = 1;
  var MAX_BALLS = 4;
  var SPAWN_DELAY_MS = 400;

  var lock = document.getElementById("screen-lock");
  var gameScreen = document.getElementById("screen-game");
  var doneScreen = document.getElementById("screen-done");
  var homeScreen = document.getElementById("screen-home");
  var placeholder = document.getElementById("screen-placeholder");
  var playfield = document.getElementById("playfield");
  var statMoney = document.getElementById("stat-money");
  var statTime = document.getElementById("stat-time");
  var doneYou = document.getElementById("done-you");
  var video = document.getElementById("ar-video");
  var fallback = document.getElementById("ar-fallback");
  var tapHint = document.getElementById("tap-hint");
  var tapOverlay = document.getElementById("tap-hint-overlay");

  var money = START_MONEY;
  var secondsLeft = DURATION_SEC;
  var timerId = null;
  var running = false;
  var ballId = 0;
  var homeUnlocked = false;

  function show(el) {
    [lock, gameScreen, doneScreen, homeScreen, placeholder].forEach(function (s) {
      s.classList.toggle("active", s === el);
    });
  }

  function formatMoney(n) {
    return "$" + n.toFixed(2);
  }

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  var BALL_IMG = "assets/images/pngtree-baseball-isolated-on-white-background-png-image_13082814.png";
  var TD_LOGO = "assets/images/TD_Bank_logo_PNG1.png";

  function baseballImg() {
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
    return wrap;
  }

  function randomPosition(btn) {
    var pf = playfield.getBoundingClientRect();
    var size = 62;
    var pad = 14;
    var maxX = Math.max(pad, pf.width - size - pad);
    var maxY = Math.max(pad, pf.height - size - pad);
    btn.style.left = pad + Math.random() * maxX + "px";
    btn.style.top = pad + Math.random() * maxY + "px";
    var dur = 1.2 + Math.random() * 0.8;
    var delay = Math.random() * 0.3;
    btn.style.animationDuration = dur + "s";
    btn.style.animationDelay = delay + "s";
  }

  function ballCount() {
    return playfield.querySelectorAll(".baseball:not(.caught):not(.missed)").length;
  }

  function spawnBall() {
    if (!running || ballCount() >= MAX_BALLS) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "baseball";
    btn.dataset.id = String(++ballId);
    btn.setAttribute("aria-label", "Catch baseball");
    btn.appendChild(baseballImg());
    randomPosition(btn);
    btn.addEventListener("click", onCatch);
    playfield.appendChild(btn);

    window.setTimeout(function () {
      if (!btn.classList.contains("caught") && btn.parentNode) {
        btn.classList.add("missed");
        window.setTimeout(function () {
          btn.remove();
          if (running) {
            window.setTimeout(spawnBall, SPAWN_DELAY_MS);
          }
        }, 400);
      }
    }, 3000);
  }

  function fillInitialBalls() {
    playfield.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      spawnBall();
    }
  }

  function onCatch(e) {
    var btn = e.currentTarget;
    if (!running || btn.classList.contains("caught")) return;
    btn.classList.add("caught");
    money += PER_CATCH;
    statMoney.textContent = formatMoney(money);
    window.setTimeout(function () {
      btn.remove();
      if (running) {
        window.setTimeout(spawnBall, SPAWN_DELAY_MS);
      }
    }, 320);
  }

  function tick() {
    secondsLeft -= 1;
    statTime.textContent = formatTime(secondsLeft);
    statTime.classList.toggle("low", secondsLeft <= 10);
    if (secondsLeft <= 0) {
      endGame();
    }
  }

  function playVideo() {
    video.src = "stadium.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().then(function () {
      fallback.classList.add("hidden");
    }).catch(function () {
      /* file missing or blocked — keep gradient fallback */
    });
  }

  function stopVideo() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    fallback.classList.remove("hidden");
  }

  function startGame() {
    money = START_MONEY;
    secondsLeft = DURATION_SEC;
    running = true;
    statMoney.textContent = formatMoney(money);
    statTime.textContent = formatTime(secondsLeft);
    statTime.classList.remove("low");
    tapHint.textContent = "Tap to catch!";
    tapOverlay.classList.remove("hidden");
    window.setTimeout(function () {
      tapOverlay.classList.add("hidden");
    }, 2000);
    fillInitialBalls();
    playVideo();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    stopVideo();
    playfield.innerHTML = "";
    var added = money - START_MONEY;
    doneYou.textContent =
      "You raised: " +
      formatMoney(money)
      ;
    show(doneScreen);
  }

  document.getElementById("btn-open-notif").addEventListener("click", function () {
    show(gameScreen);
    startGame();
  });

  document.getElementById("btn-continue").addEventListener("click", function () {
    homeUnlocked = true;
    show(homeScreen);
  });

  document.getElementById("ph-back").addEventListener("click", function () {
    show(lock);
  });

  document.querySelectorAll("[data-nav]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var nav = btn.dataset.nav;
      if (nav === "game") return;
      if (nav === "home") {
        if (homeUnlocked) {
          show(homeScreen);
        }
        return;
      }
      var titles = {
        tickets: "Tickets",
        order: "Order",
        profile: "Profile",
      };
      document.getElementById("ph-title").textContent = titles[nav] || "Ballpark";
      show(placeholder);
    });
  });

  window.addEventListener("resize", function () {
    if (!running) return;
    playfield.querySelectorAll(".baseball:not(.caught)").forEach(function (b) {
      randomPosition(b);
    });
  });
})();
