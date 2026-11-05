
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = 960;
  const H = 540;
  const WORLD_W = 2700;
  const keys = Object.create(null);

  ctx.imageSmoothingEnabled = false;

  let scene = "menu";
  let camera = 0;
  let score = 0;
  let frame = 0;
  let stars = [];
  let fragments = [];
  let deathTimer = 0;
  let message = "";
  let messageTimer = 0;

  // Audio effects: Dropbox links supplied for the game.
  const attackSound = new Audio(
    "https://www.dropbox.com/scl/fi/ugvp7ukwxizkyplz0oapy/Fast-_sharp_wooden_s_-3-1792103700649.mp3?rlkey=ez29aoog19nn3dxl76ocbkjj3&st=km3vc1lb&raw=1"
  );

  const jumpSound = new Audio(
    "https://www.dropbox.com/scl/fi/0u02x2wxo6yh6bmaqmwln/A_quick-_light_magic_-2-1792103812887.mp3?rlkey=2yr4u8v2z7e8b9orbe3ho02s2&st=z59b685z&raw=1"
  );

  const defeatSound = new Audio(
    "https://www.dropbox.com/scl/fi/95jxrfx6gip5rotk8fkan/A_satisfying_magical_-4-1792533839116.mp3?rlkey=5zxmkzz3ujhikllb7dhtd7blk&st=4uvvqvsz&raw=1"
  );

  [attackSound, jumpSound, defeatSound].forEach(audio => {
    audio.preload = "auto";
    audio.volume = 0.75;
  });

  function playSound(audio) {
    try {
      audio.currentTime = 0;
      const result = audio.play();

      if (result) {
        result.catch(() => {
          console.warn("Audio could not play. Check the Dropbox link.");
        });
      }
    } catch (error) {
      console.warn("Audio error:", error);
    }
  }

  // Mira
  const player = {
    x: 70,
    y: 439,
    w: 24,
    h: 36,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    hp: 4,
    inv: 0,
    attack: 0,
    attackId: 0,
    cocoon: false
  };

  /*
    FIXED ABYSSES:
    Ground gaps are now 30, 25, 40 and 40 pixels.
    The third abyss is only 40 pixels wide.
  */
  const platforms = [
    { x: 0,    y: 475, w: 630, h: 80 },
    { x: 660,  y: 475, w: 440, h: 80 },
    { x: 1125, y: 475, w: 460, h: 80 },
    { x: 1625, y: 475, w: 430, h: 80 },
    { x: 2095, y: 475, w: 605, h: 80 },

    { x: 230,  y: 390, w: 125, h: 18 },
    { x: 435,  y: 330, w: 115, h: 18 },
    { x: 740,  y: 390, w: 130, h: 18 },
    { x: 955,  y: 335, w: 115, h: 18 },
    { x: 1230, y: 390, w: 125, h: 18 },
    { x: 1450, y: 325, w: 130, h: 18 },
    { x: 1740, y: 390, w: 125, h: 18 },
    { x: 1955, y: 330, w: 125, h: 18 },
    { x: 2250, y: 390, w: 130, h: 18 },
    { x: 2470, y: 330, w: 125, h: 18 }
  ];

  // Thorn locations moved away from dangerous ledges.
  const thorns = [
    { x: 540,  y: 451, w: 50, h: 24 },
    { x: 1000, y: 451, w: 65, h: 24 },
    { x: 1480, y: 451, w: 65, h: 24 },
    { x: 1955, y: 451, w: 65, h: 24 }
  ];

  const beetleSpawns = [330, 820, 1300, 1810, 2310];
  let beetles = [];

  const leaves = Array.from({ length: 58 }, (_, i) => ({
    x: (i * 173 + 37) % WORLD_W,
    y: (i * 83) % 450,
    s: 3 + i % 3,
    speed: 0.35 + (i % 5) * 0.12,
    phase: i * 1.7
  }));

  const door = {
    x: 2600,
    y: 405,
    w: 44,
    h: 70
  };

  // Night Moth boss
  const boss = {
    x: 740,
    y: 290,
    hp: 12,
    maxHp: 12,
    bob: 0,
    cooldown: 80,
    nextAttack: "volley",
    rainTimer: 0,
    lastAttackId: -1
  };

  function say(text, time = 90) {
    message = text;
    messageTimer = time;
  }

  function resetGame() {
    scene = "menu";
    camera = 0;
    score = 0;
    frame = 0;
    stars = [];
    fragments = [];
    deathTimer = 0;

    player.x = 70;
    player.y = 439;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.hp = 4;
    player.inv = 0;
    player.attack = 0;
    player.attackId = 0;
    player.cocoon = false;
    player.onGround = false;

    beetles = beetleSpawns.map((x, i) => ({
      x,
      start: x,
      minX: x - 55,
      maxX: x + 55,
      y: 445,
      w: 30,
      h: 30,
      hp: 2,
      alive: true,
      dir: i % 2 ? -1 : 1,
      speed: 0.65 + i * 0.05,
      lastAttackId: -1
    }));

    boss.hp = boss.maxHp;
    boss.y = 290;
    boss.bob = 0;
    boss.cooldown = 80;
    boss.nextAttack = "volley";
    boss.rainTimer = 0;
    boss.lastAttackId = -1;

    message = "";
    messageTimer = 0;
  }

  function startGame() {
    resetGame();
    scene = "garden";
    say("Доберись до двери в конце сада!", 150);
  }

  function returnToMenu() {
    resetGame();
    scene = "menu";
  }

  function enterBossRoom() {
    scene = "boss";
    camera = 0;
    stars = [];
    fragments = [];
    deathTimer = 0;

    player.x = 65;
    player.y = 439;
    player.vx = 0;
    player.vy = 0;
    player.inv = 70;
    player.attack = 0;
    player.onGround = false;

    boss.hp = boss.maxHp;
    boss.y = 290;
    boss.bob = 0;
    boss.cooldown = 90;
    boss.nextAttack = "volley";
    boss.rainTimer = 0;
    boss.lastAttackId = -1;

    say("КОМНАТА НОЧНОГО МОТА!", 140);
  }

  function overlaps(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function damagePlayer() {
    if (player.inv > 0 || player.cocoon) return;

    player.hp--;
    player.inv = 85;
    player.vy = -5;
    player.vx = -player.facing * 3;

    if (player.hp <= 0) {
      scene = "defeat";
      stars = [];
      fragments = [];
    }
  }

  function attackBox() {
    return {
      x: player.facing === 1
        ? player.x + player.w - 1
        : player.x - 47,
      y: player.y + 8,
      w: 48,
      h: 25
    };
  }

  // Moth attack 1: a fan of sparkling stars.
  function spawnVolley() {
    const sx = boss.x - 8;
    const sy = boss.y + 8;

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;

    const base = Math.atan2(
      targetY - sy,
      targetX - sx
    );

    for (let i = -3; i <= 3; i++) {
      const angle = base + i * 0.17;
      const speed = 3.25;

      stars.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 8,
        kind: "shot",
        life: 260,
        spin: 0
      });
    }

    say("ЗВЁЗДНЫЙ БРОСОК!", 55);
  }

  // Moth attack 2: raining stars.
  function spawnRainStar() {
    const x = 55 + Math.random() * (W - 110);

    stars.push({
      x,
      y: -15,
      vx: (player.x + player.w / 2 - x) * 0.008,
      vy: 3.2 + Math.random() * 1.3,
      r: 8,
      kind: "rain",
      life: 230,
      spin: Math.random() * 6
    });
  }

  // Player movement and platform collision.
  function updatePlayer(levelWidth) {
    player.cocoon = !!(
      keys.ArrowDown ||
      keys.KeyS
    );

    if (player.cocoon) {
      player.vx = 0;
    } else if (keys.ArrowLeft || keys.KeyA) {
      player.vx = -3.1;
      player.facing = -1;
    } else if (keys.ArrowRight || keys.KeyD) {
      player.vx = 3.1;
      player.facing = 1;
    } else {
      player.vx *= 0.78;
    }

    // Save the previous bottom edge before moving.
    const previousBottom = player.y + player.h;

    player.vy += 0.55;
    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(
      0,
      Math.min(levelWidth - player.w, player.x)
    );

    player.onGround = false;

    if (scene === "garden") {
      for (const q of platforms) {
        if (
          player.x < q.x + q.w &&
          player.x + player.w > q.x &&
          previousBottom <= q.y &&
          player.y + player.h >= q.y &&
          player.vy >= 0
        ) {
          player.y = q.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }

      for (const t of thorns) {
        if (overlaps(player, {
          x: t.x,
          y: t.y + 8,
          w: t.w,
          h: t.h - 8
        })) {
          damagePlayer();
        }
      }

      // Recover if Mira falls below the level.
      if (player.y > H + 100) {
        player.hp--;
        player.x = Math.max(20, player.x - 110);
        player.y = 390;
        player.vy = 0;
        player.inv = 60;

        if (player.hp <= 0) {
          scene = "defeat";
        }
      }
    } else {
      // Flat floor in the boss room.
      const floor = 475;

      if (
        player.y + player.h >= floor &&
        player.vy >= 0
      ) {
        player.y = floor - player.h;
        player.vy = 0;
        player.onGround = true;
      }

      if (player.y < 20) {
        player.y = 20;
        player.vy = Math.max(0, player.vy);
      }
    }

    if (player.inv > 0) player.inv--;
    if (player.attack > 0) player.attack--;
  }

  // Garden enemies and the exit door.
  function updateGarden() {
    updatePlayer(WORLD_W);

    const box = attackBox();

    for (const e of beetles) {
      if (!e.alive) continue;

      e.x += e.dir * e.speed;

      if (e.x <= e.minX || e.x >= e.maxX) {
        e.dir *= -1;
        e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
      }

      if (
        player.attack > 0 &&
        overlaps(box, e) &&
        e.lastAttackId !== player.attackId
      ) {
        e.lastAttackId = player.attackId;
        e.hp--;
        e.x += player.facing * 10;

        if (e.hp <= 0) {
          e.alive = false;
          score++;
          playSound(defeatSound);
        }
      } else if (overlaps(player, e)) {
        damagePlayer();
      }
    }

    camera = Math.max(
      0,
      Math.min(WORLD_W - W, player.x - W * 0.38)
    );

    if (overlaps(player, door)) {
      enterBossRoom();
    }
  }

  // Begin the Night Moth's death animation.
  function beginBossDeath() {
    scene = "bossDeath";
    deathTimer = 0;
    stars = [];
    fragments = [];

    const colors = [
      "#fff0a6",
      "#d6cbff",
      "#aebcff",
      "#f8e6ff",
      "#30263d",
      "#171725"
    ];

    // Scatter glowing stars and pieces of dark wings.
    for (let i = 0; i < 78; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.1 + Math.random() * 4.1;
      const life = 48 + Math.random() * 45;

      fragments.push({
        x: boss.x + (Math.random() - 0.5) * 145,
        y: boss.y + (Math.random() - 0.5) * 105,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        gravity: 0.025 + Math.random() * 0.07,
        size: 2 + Math.random() * 5,
        life,
        maxLife: life,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.25,
        type: Math.random() < 0.42 ? "wing" : "star",
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    playSound(defeatSound);
    say("НОЧНОЙ МОТ РАССЫПАЕТСЯ В ЗВЁЗДЫ…", 95);
  }

  function updateBossDeath() {
    deathTimer++;

    for (let i = fragments.length - 1; i >= 0; i--) {
      const p = fragments[i];

      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.992;
      p.spin += p.spinSpeed;
      p.life--;

      if (p.life <= 0) {
        fragments.splice(i, 1);
      }
    }

    // Victory only appears after the particles fade.
    if (deathTimer >= 108) {
      scene = "victory";
      say("САД СНОВА ЗАСИЯЛ!", 999999);
    }
  }

  function updateBoss() {
    updatePlayer(W);

    boss.bob += 0.035;
    boss.y = 290 + Math.sin(boss.bob) * 13;

    // Alternate between star volley and star rain.
    if (boss.rainTimer > 0) {
      boss.rainTimer--;

      if (frame % 7 === 0) {
        spawnRainStar();
      }

      if (boss.rainTimer === 0) {
        boss.cooldown = 70;
        say("Берегись следующей атаки!", 45);
      }
    } else {
      boss.cooldown--;

      if (boss.cooldown <= 0) {
        if (boss.nextAttack === "volley") {
          spawnVolley();
          boss.nextAttack = "rain";
          boss.cooldown = 140;
        } else {
          boss.rainTimer = 105;
          boss.nextAttack = "volley";
          say("ЗВЁЗДНЫЙ ДОЖДЬ — двигайся!", 105);
        }
      }
    }

    const mothBox = {
      x: boss.x - 98,
      y: boss.y - 80,
      w: 196,
      h: 160
    };

    const swing = attackBox();

    if (
      player.attack > 0 &&
      overlaps(swing, mothBox) &&
      boss.lastAttackId !== player.attackId
    ) {
      boss.lastAttackId = player.attackId;
      boss.hp--;

      if (boss.hp <= 0) {
        beginBossDeath();
        return;
      }

      say("Попадание!", 22);
    }

    // Star projectiles damage Mira.
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];

      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      s.spin += 0.12;

      const starBox = {
        x: s.x - s.r,
        y: s.y - s.r,
        w: s.r * 2,
        h: s.r * 2
      };

      if (overlaps(player, starBox)) {
        damagePlayer();
        stars.splice(i, 1);
        continue;
      }

      if (
        s.life <= 0 ||
        s.x < -50 ||
        s.x > W + 50 ||
        s.y > H + 50
      ) {
        stars.splice(i, 1);
      }
    }
  }

  // Drawing helpers.
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }

    ctx.closePath();
    ctx.fill();
  }

  function starShape(x, y, r, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? r : r * 0.43;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMira() {
    const x = player.x;
    const y = player.y;

    if (player.cocoon) {
      rect(x - 4, y + 7, 32, 28, "#493026");
      rect(x + 2, y + 2, 19, 30, "#65402c");
      rect(x + 5, y + 7, 4, 4, "#f8dca1");
      return;
    }

    const moving = Math.abs(player.vx) > 0.6 || !player.onGround;

    if (moving) {
      polygon([
        [x + 12, y + 13],
        [x - 13, y - 3],
        [x - 9, y + 23],
        [x + 10, y + 31]
      ], "#f0782d");

      polygon([
        [x + 14, y + 13],
        [x + 35, y - 4],
        [x + 31, y + 24],
        [x + 15, y + 31]
      ], "#e9a13a");

      rect(x - 7, y + 5, 4, 14, "#f8c65e");
      rect(x + 28, y + 5, 4, 14, "#f8c65e");
    }

    rect(x + 5, y + 12, 15, 21, "#4b3027");
    rect(x + 4, y + 6, 17, 15, "#67432d");
    rect(x + 7, y, 13, 13, "#e8bd8c");
    rect(x + 6, y - 2, 14, 6, "#4a3025");

    rect(
      x + 8 + (player.facing === 1 ? 5 : 0),
      y + 5,
      3,
      3,
      "#25252b"
    );

    rect(x + 7, y + 31, 5, 5, "#30252a");
    rect(x + 16, y + 31, 5, 5, "#30252a");

    // Wooden stick, including attack swing.
    ctx.save();

    if (player.attack > 0) {
      ctx.translate(
        player.facing === 1 ? x + 20 : x - 34,
        y + 17
      );

      ctx.rotate(player.facing === 1 ? -0.45 : 0.45);

      rect(0, -3, 39, 6, "#6e4527");
      rect(3, -2, 31, 2, "#b7834b");
      rect(0, -3, 5, 6, "#4c3222");
    } else {
      ctx.translate(
        player.facing === 1 ? x + 19 : x - 3,
        y + 20
      );

      ctx.rotate(player.facing === 1 ? -0.45 : 0.45);

      rect(0, -2, 24, 4, "#754a2b");
      rect(3, -1, 17, 1, "#b7834b");
    }

    ctx.restore();
  }

  // Autumn garden scene.
  function drawGarden() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#263747");
    g.addColorStop(0.62, "#8c674e");
    g.addColorStop(1, "#d49a52");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camera, 0);

    // Greenhouse framework.
    for (let x = 0; x < WORLD_W; x += 160) {
      rect(x, 35, 5, 440, "#35434a");
      rect(x + 70, 35, 3, 440, "#52605b");
      rect(x, 35, 160, 4, "#52605b");
    }

    // Distant plants.
    for (let i = 0; i < 22; i++) {
      const x = i * 145;

      rect(x, 300 + (i % 4) * 14, 70, 175, "#35483c");
      rect(x + 12, 270 + (i % 3) * 17, 12, 70, "#4d6443");
      rect(x + 37, 310, 13, 65, "#617047");
    }

    // Falling leaves.
    for (const l of leaves) {
      const y = (l.y + frame * l.speed) % 460;

      ctx.fillStyle = [
        "#c95c32",
        "#e9a33d",
        "#a8442f",
        "#d6b85a"
      ][Math.floor(l.phase) % 4];

      ctx.fillRect(
        l.x + Math.sin(frame * 0.025 + l.phase) * 7,
        y,
        l.s + 2,
        l.s
      );
    }

    // Platforms.
    for (const q of platforms) {
      rect(q.x, q.y, q.w, q.h, "#49382f");
      rect(q.x, q.y, q.w, 7, "#7e653e");

      for (let x = q.x + 8; x < q.x + q.w; x += 25) {
        rect(x, q.y + 10, 3, 5, "#9b7844");
        rect(x + 9, q.y + 25, 2, 4, "#302e2b");
      }
    }

    // Thorn spikes.
    for (const t of thorns) {
      for (let x = t.x; x < t.x + t.w; x += 11) {
        polygon([
          [x, t.y + 18],
          [x + 5, t.y],
          [x + 10, t.y + 18]
        ], "#4f643d");
      }
    }

    // Ancient gears.
    for (const [gx, gy] of [
      [530, 245],
      [1390, 245],
      [2220, 235]
    ]) {
      ctx.strokeStyle = "#75614a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(gx, gy, 36, 0, Math.PI * 2);
      ctx.stroke();

      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;

        rect(
          gx + Math.cos(ang) * 34 - 4,
          gy + Math.sin(ang) * 34 - 4,
          8,
          8,
          "#8b704b"
        );
      }

      ctx.fillStyle = "#d5a65d";
      ctx.beginPath();
      ctx.arc(gx, gy, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Beetles.
    for (const e of beetles) {
      if (!e.alive) continue;

      rect(e.x, e.y + 7, e.w, e.h - 7, "#6c6550");
      rect(e.x + 3, e.y, e.w - 6, 12, "#91846a");
      rect(e.x + 5, e.y + 10, 5, 5, "#f4a04a");
      rect(e.x + 20, e.y + 10, 5, 5, "#f4a04a");
      rect(e.x + 4, e.y + 25, 5, 7, "#3c3932");
      rect(e.x + 21, e.y + 25, 5, 7, "#3c3932");
    }

    // Door to the separate boss room.
    rect(door.x, door.y, door.w, 70, "#49362e");
    rect(door.x + 7, door.y + 7, 30, 63, "#d4a44d");
    rect(door.x + 13, door.y + 14, 18, 49, "#5d6c4b");
    rect(door.x + 18, door.y + 20, 7, 7, "#f6d77d");

    drawMira();
    ctx.restore();
  }

  // Starry, moonlit boss room.
  function drawBossRoom() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#11172b");
    g.addColorStop(0.7, "#292744");
    g.addColorStop(1, "#583b52");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#202945";
    ctx.beginPath();
    ctx.arc(480, 110, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d6e8ff";
    ctx.beginPath();
    ctx.arc(480, 110, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#202945";
    ctx.beginPath();
    ctx.arc(500, 94, 40, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const x = i * 135 + 18;
      rect(x, 85, 18, 390, "#282b43");
      rect(x - 10, 80, 38, 10, "#41415e");
      rect(x + 3, 105, 3, 330, "#5c4e69");
    }

    for (let i = 0; i < 55; i++) {
      const x = (i * 137 + frame * 0.25) % W;
      const y = (
        i * 61 + Math.sin(frame * 0.02 + i) * 7
      ) % 430;

      starShape(
        x, y, 2 + i % 3,
        i % 2 ? "#d6cbff" : "#8da8ff",
        frame * 0.01 + i
      );
    }

    rect(0, 475, W, 65, "#292536");
    rect(0, 475, W, 8, "#706078");

    for (let x = 0; x < W; x += 42) {
      rect(x, 493, 24, 3, "#473c51");
      rect(x + 14, 512, 3, 12, "#473c51");
    }

    drawMoth();

    for (const s of stars) {
      starShape(
        s.x, s.y, s.r,
        s.kind === "rain" ? "#fff5a9" : "#ffe9ff",
        s.spin
      );
    }

    drawFragments();

    // Brief flash at the beginning of the moth's defeat.
    if (scene === "bossDeath" && deathTimer < 11) {
      ctx.fillStyle =
        "rgba(255,245,210," +
        ((11 - deathTimer) / 11 * 0.34) +
        ")";

      ctx.fillRect(0, 0, W, H);
    }

    drawMira();
  }

  // Draw the moth, including its death transformation.
  function drawMoth() {
    const x = boss.x;
    const y = boss.y;

    ctx.save();

    if (scene === "bossDeath") {
      const t = deathTimer;
      const rise = Math.min(62, t * 0.78);
      const shrink = Math.max(0.12, 1 - t * 0.0082);
      const alpha = t < 34
        ? (Math.floor(t / 3) % 2 === 0 ? 0.28 : 1)
        : Math.max(0, 1 - (t - 34) / 48);

      ctx.translate(x, y - rise);
      ctx.rotate(Math.sin(t * 0.42) * 0.10 + t * 0.003);
      ctx.scale(1 + Math.min(t, 60) * 0.002, shrink);
      ctx.translate(-x, -y);
      ctx.globalAlpha *= alpha;
    }

    // Dark wings.
    polygon([
      [x - 28, y - 10],
      [x - 92, y - 77],
      [x - 116, y - 69],
      [x - 104, y - 26],
      [x - 119, y + 10],
      [x - 75, y + 53],
      [x - 30, y + 39]
    ], "#171725");

    polygon([
      [x + 28, y - 10],
      [x + 92, y - 77],
      [x + 116, y - 69],
      [x + 104, y - 26],
      [x + 119, y + 10],
      [x + 75, y + 53],
      [x + 30, y + 39]
    ], "#171725");

    polygon([
      [x - 32, y + 2],
      [x - 83, y - 49],
      [x - 93, y - 19],
      [x - 76, y + 22],
      [x - 39, y + 42]
    ], "#30263d");

    polygon([
      [x + 32, y + 2],
      [x + 83, y - 49],
      [x + 93, y - 19],
      [x + 76, y + 22],
      [x + 39, y + 42]
    ], "#30263d");

    // Glowing stars on wings.
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? -1 : 1;
      const dx = side * (40 + (i * 17) % 58);
      const dy = -49 + (i * 23) % 88;

      starShape(
        x + dx, y + dy,
        2 + i % 3,
        i % 3 === 0 ? "#fff0a6" : "#c7b7ff",
        frame * 0.025 + i
      );
    }

    // Antennae.
    ctx.strokeStyle = "#c3b2dd";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x - 8, y - 30);
    ctx.quadraticCurveTo(x - 32, y - 60, x - 40, y - 48);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 8, y - 30);
    ctx.quadraticCurveTo(x + 32, y - 60, x + 40, y - 48);
    ctx.stroke();

    // Starry body.
    rect(x - 26, y - 25, 52, 88, "#33253e");
    rect(x - 20, y - 20, 40, 76, "#514063");
    rect(x - 15, y - 10, 30, 58, "#392943");

    for (let i = 0; i < 9; i++) {
      starShape(
        x - 15 + (i * 13) % 30,
        y - 14 + (i * 19) % 64,
        2 + i % 2,
        "#fff0a6",
        frame * 0.035 + i
      );
    }

    // Big white eyes.
    ctx.fillStyle = "#fffdf1";

    ctx.beginPath();
    ctx.ellipse(x - 13, y - 5, 12, 16, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x + 13, y - 5, 12, 16, 0.12, 0, Math.PI * 2);
    ctx.fill();

    rect(x - 17, y - 9, 5, 8, "#161626");
    rect(x + 9, y - 9, 5, 8, "#161626");
    rect(x - 28, y + 25, 4, 4, "#fff0a6");
    rect(x + 23, y + 18, 4, 4, "#fff0a6");

    ctx.restore();
  }

  function drawFragments() {
    for (const p of fragments) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === "star") {
        starShape(p.x, p.y, p.size, p.color, p.spin);
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);

        polygon([
          [-p.size, -p.size * 0.55],
          [p.size * 1.3, -p.size * 0.25],
          [p.size * 0.45, p.size],
          [-p.size * 0.8, p.size * 0.4]
        ], p.color);
      }

      ctx.restore();
    }
  }

  // Main menu.
  function drawMenu() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#17263b");
    g.addColorStop(0.65, "#573e43");
    g.addColorStop(1, "#d18a45");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 48; i++) {
      const x = (i * 97 + frame * 0.2) % W;
      const y = (i * 71) % H;

      ctx.fillStyle = i % 2 ? "#e9a33d" : "#bf5334";
      ctx.fillRect(x, y, 5, 8);
    }

    ctx.fillStyle = "rgba(14,17,29,.76)";
    ctx.fillRect(105, 65, 750, 410);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffc86b";
    ctx.font = "bold 34px monospace";
    ctx.fillText("САД ЗАСТЫВШЕГО ВРЕМЕНИ", W / 2, 142);

    ctx.fillStyle = "#f8e9cc";
    ctx.font = "17px monospace";
    ctx.fillText("Приключение Миры начинается здесь", W / 2, 181);

    // Mira's wings.
    polygon([
      [434, 225], [390, 191], [397, 243], [434, 264]
    ], "#e8752d");

    polygon([
      [446, 225], [490, 191], [483, 243], [446, 264]
    ], "#f4aa42");

    rect(431, 215, 18, 48, "#4b3027");
    rect(434, 203, 12, 16, "#e8bd8c");

    // Start button.
    rect(340, 293, 280, 60, "#a65737");
    rect(347, 300, 266, 46, "#ce8046");

    ctx.fillStyle = "#fff1d1";
    ctx.font = "bold 23px monospace";
    ctx.fillText("НАЧАТЬ ИГРУ", W / 2, 330);

    ctx.fillStyle = "#f1dfc3";
    ctx.font = "14px monospace";
    ctx.fillText("Движение: A/D или стрелки", W / 2, 390);
    ctx.fillText("Прыжок: SPACE / X    Палка: Z", W / 2, 415);
    ctx.fillText("Кокон: S / ↓    Перезапуск: R", W / 2, 440);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#d1bca3";
    ctx.fillText("Нажми кнопку или ENTER / SPACE", W / 2, 462);

    ctx.textAlign = "left";
  }

  function drawHud() {
    rect(12, 12, 300, 44, "rgba(12,15,24,.84)");

    ctx.fillStyle = "#ffe0a1";
    ctx.font = "bold 15px monospace";

    ctx.fillText(
      scene === "garden" ? "ЗОЛОТАЯ ОРАНЖЕРЕЯ" : "КОМНАТА НОЧНОГО МОТА",
      23, 30
    );

    ctx.font = "12px monospace";
    ctx.fillStyle = "#fff0d1";
    ctx.fillText(
      "МИРА  " + ("♥ ".repeat(Math.max(0, player.hp)) || "—"),
      23, 47
    );

    if (scene === "garden") {
      rect(W - 198, 14, 184, 30, "rgba(12,15,24,.84)");
      ctx.fillStyle = "#ffe0a1";
      ctx.fillText("ЖУКИ: " + score + "/" + beetles.length, W - 185, 33);

      rect(door.x - camera - 7, door.y - 25, 58, 17, "#1b2028");
      ctx.fillStyle = "#ffe0a1";
      ctx.fillText("ВЫХОД", door.x - camera + 1, door.y - 13);
    }

    if (
      scene === "boss" ||
      scene === "bossDeath" ||
      scene === "victory"
    ) {
      rect(320, 15, 320, 38, "rgba(12,15,24,.85)");

      ctx.fillStyle = "#ffe0a1";
      ctx.textAlign = "center";
      ctx.fillText("ХРАНИТЕЛЬ: НОЧНОЙ МОТ", 480, 30);

      rect(342, 36, 276, 9, "#4a2436");
      rect(
        342, 36,
        276 * Math.max(0, boss.hp) / boss.maxHp,
        9,
        "#ef8cb2"
      );

      ctx.textAlign = "left";
    }

    if (messageTimer > 0 && message) {
      ctx.font = "14px monospace";
      const width = Math.min(700, ctx.measureText(message).width + 36);

      rect((W - width) / 2, 66, width, 32, "rgba(12,15,24,.86)");

      ctx.fillStyle = "#fff0c8";
      ctx.textAlign = "center";
      ctx.fillText(message, W / 2, 87);
      ctx.textAlign = "left";
    }

    rect(10, H - 31, W - 20, 22, "rgba(12,15,24,.72)");
    ctx.fillStyle = "#e6d9c1";
    ctx.font = "11px monospace";

    ctx.fillText(
      "MOVE: A/D or ←/→   JUMP: SPACE / X / ↑   STICK: Z   COCOON: S / ↓   RESTART: R",
      18, H - 16
    );
  }

  function drawEndScreen() {
    if (scene !== "victory" && scene !== "defeat") return;

    rect(0, 0, W, H, "rgba(8,10,18,.74)");

    ctx.textAlign = "center";
    ctx.fillStyle = scene === "victory" ? "#ffe7a1" : "#f6a4b5";
    ctx.font = "bold 34px monospace";

    ctx.fillText(
      scene === "victory" ? "САД СНОВА ЗАСИЯЛ!" : "МИРА УСНУЛА…",
      W / 2,
      H / 2 - 12
    );

    ctx.fillStyle = "#fff2d4";
    ctx.font = "16px monospace";
    ctx.fillText("Нажми R, чтобы вернуться в меню", W / 2, H / 2 + 26);

    ctx.textAlign = "left";
  }

  function draw() {
    if (scene === "menu") {
      drawMenu();
      return;
    }

    if (scene === "garden") {
      drawGarden();
    } else {
      drawBossRoom();
    }

    drawHud();
    drawEndScreen();
  }

  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();

    return {
      x: (e.clientX - r.left) * W / r.width,
      y: (e.clientY - r.top) * H / r.height
    };
  }

  canvas.addEventListener("pointerdown", e => {
    const p = canvasPoint(e);

    if (
      scene === "menu" &&
      p.x >= 325 && p.x <= 635 &&
      p.y >= 280 && p.y <= 360
    ) {
      startGame();
    } else if (scene === "victory" || scene === "defeat") {
      returnToMenu();
    }

    canvas.focus();
  });

  // Keyboard controls.
  document.addEventListener("keydown", e => {
    if ([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space"
    ].includes(e.code)) {
      e.preventDefault();
    }

    keys[e.code] = true;

    if (e.code === "KeyR") {
      returnToMenu();
      return;
    }

    if (scene === "menu") {
      if (e.code === "Enter" || e.code === "Space") {
        startGame();
      }
      return;
    }

    if (scene === "victory" || scene === "defeat") {
      if (e.code === "Enter" || e.code === "Space") {
        returnToMenu();
      }
      return;
    }

    if (e.repeat) return;

    if (
      (e.code === "KeyZ" || e.code === "KeyJ") &&
      (scene === "garden" || scene === "boss")
    ) {
      if (player.attack <= 0) {
        player.attack = 15;
        player.attackId++;
        playSound(attackSound);
      }
    }

    if (
      ["Space", "ArrowUp", "KeyX", "KeyW"].includes(e.code) &&
      (scene === "garden" || scene === "boss") &&
      player.onGround &&
      !player.cocoon
    ) {
      player.vy = -11.5;
      player.onGround = false;
      playSound(jumpSound);
    }
  });

  document.addEventListener("keyup", e => {
    keys[e.code] = false;
  });

  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
  });

  // Main loop.
  function loop() {
    try {
      frame++;

      if (messageTimer > 0) messageTimer--;

      if (scene === "garden") {
        updateGarden();
      } else if (scene === "boss") {
        updateBoss();
      } else if (scene === "bossDeath") {
        updateBossDeath();
      }

      // Update falling particles during the boss death.
      if (scene === "bossDeath") {
        for (let i = fragments.length - 1; i >= 0; i--) {
          const p = fragments[i];

          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.992;
          p.spin += p.spinSpeed;
          p.life--;

          if (p.life <= 0) {
            fragments.splice(i, 1);
          }
        }
      }

      draw();
    } catch (error) {
      console.error("Frozen Garden game error:", error);

      ctx.fillStyle = "#151927";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "18px monospace";
      ctx.fillText("Game error — open CodePen Console (F12)", 25, 45);
      ctx.font = "13px monospace";
      ctx.fillText(String(error.message || error), 25, 75);
    }

    requestAnimationFrame(loop);
  }

  resetGame();
  scene = "menu";
  loop();
})();
