// Dino Runner Game Engine
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI Elements
  const currentScoreEl = document.getElementById('currentScore');
  const highScoreEl = document.getElementById('highScore');
  const overlay = document.getElementById('gameOverlay');
  const overlayIcon = document.getElementById('overlayIcon');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const actionBtn = document.getElementById('actionBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const jumpTouchBtn = document.getElementById('jumpTouchBtn');
  const duckTouchBtn = document.getElementById('duckTouchBtn');

  // Audio Synthesizer (Web Audio API)
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, slideFreq = null) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
      }
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback fail-safe
    }
  }

  function soundJump() { playTone(280, 'square', 0.12, 600); }
  function soundScore() { playTone(650, 'sine', 0.08, 980); }
  function soundHit() { playTone(120, 'sawtooth', 0.28, 40); }

  // Game Constants & Variables
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 260;
  const GROUND_Y = 215;
  const GRAVITY = 0.65;
  const JUMP_FORCE = -11.5;
  const INITIAL_SPEED = 6;
  const MAX_SPEED = 14;

  let speed = INITIAL_SPEED;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('chrono_dino_hi') || '0', 10);
  let isPlaying = false;
  let isGameOver = false;
  let animationFrameId = null;
  let lastSpawnDist = 0;
  let lastScoreMilestone = 0;

  highScoreEl.textContent = String(highScore).padStart(5, '0');

  // Input State
  const keys = {
    jump: false,
    duck: false
  };

  // Dino Player Object
  const dino = {
    x: 60,
    y: GROUND_Y,
    width: 44,
    height: 48,
    standHeight: 48,
    duckHeight: 28,
    vy: 0,
    isGrounded: true,
    isDucking: false,
    animTick: 0,
    trail: [],

    reset() {
      this.y = GROUND_Y;
      this.vy = 0;
      this.isGrounded = true;
      this.isDucking = false;
      this.height = this.standHeight;
      this.animTick = 0;
      this.trail = [];
    },

    jump() {
      if (this.isGrounded && !this.isDucking) {
        this.vy = JUMP_FORCE;
        this.isGrounded = false;
        soundJump();
      }
    },

    update() {
      // Duck state adjustment
      if (keys.duck && this.isGrounded) {
        this.isDucking = true;
        this.height = this.duckHeight;
        this.y = GROUND_Y + (this.standHeight - this.duckHeight);
      } else {
        if (this.isDucking) {
          this.isDucking = false;
          this.height = this.standHeight;
          this.y = GROUND_Y;
        }
      }

      // Fast-fall if pressing duck in midair
      if (!this.isGrounded && keys.duck) {
        this.vy += GRAVITY * 1.5;
      }

      // Physics
      this.vy += GRAVITY;
      this.y += this.vy;

      const targetY = this.isDucking ? (GROUND_Y + (this.standHeight - this.duckHeight)) : GROUND_Y;
      if (this.y >= targetY) {
        this.y = targetY;
        this.vy = 0;
        this.isGrounded = true;
      }

      this.animTick++;

      // Particle Trail when running
      if (this.animTick % 3 === 0) {
        this.trail.push({
          x: this.x + 8,
          y: this.y + this.height - 4,
          r: 3 + Math.random() * 2,
          alpha: 0.6
        });
      }

      for (let i = this.trail.length - 1; i >= 0; i--) {
        const p = this.trail[i];
        p.x -= speed;
        p.alpha -= 0.04;
        if (p.alpha <= 0) {
          this.trail.splice(i, 1);
        }
      }
    },

    draw() {
      // Draw Trail
      ctx.save();
      for (const p of this.trail) {
        ctx.fillStyle = `rgba(6, 182, 212, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, this.y);

      // Dino Styling: Neon Cyber Rex
      const legStep = Math.floor(this.animTick / 6) % 2;

      if (!this.isDucking) {
        // Body / Glow
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#06b6d4';

        // Head
        ctx.fillRect(18, 0, 24, 18);
        ctx.fillRect(26, 18, 16, 6);
        // Eye (glow yellow)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(32, 4, 4, 4);

        // Body
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(10, 16, 18, 22);

        // Snout/Teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(40, 12, 3, 4);

        // Tail
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(0, 20, 10, 8);
        ctx.fillRect(4, 28, 6, 6);

        // Arms
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(28, 24, 8, 4);

        // Legs
        ctx.fillStyle = '#38bdf8';
        if (this.isGrounded) {
          if (legStep === 0) {
            ctx.fillRect(12, 38, 5, 10);
            ctx.fillRect(22, 38, 5, 7);
          } else {
            ctx.fillRect(12, 38, 5, 7);
            ctx.fillRect(22, 38, 5, 10);
          }
        } else {
          // Mid-air legs tucked
          ctx.fillRect(12, 38, 5, 6);
          ctx.fillRect(20, 36, 5, 6);
        }
      } else {
        // Ducking Dino
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f59e0b';

        // Stretched elongated body
        ctx.fillRect(2, 6, 38, 14);
        // Head lower down
        ctx.fillRect(36, 4, 16, 14);
        // Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(46, 7, 3, 3);
        // Legs
        ctx.fillStyle = '#d97706';
        if (legStep === 0) {
          ctx.fillRect(10, 20, 5, 8);
          ctx.fillRect(26, 20, 5, 5);
        } else {
          ctx.fillRect(10, 20, 5, 5);
          ctx.fillRect(26, 20, 5, 8);
        }
      }

      ctx.restore();
    },

    getHitbox() {
      // Slightly tighter bounding box for fair hit detection
      const pad = 5;
      return {
        x: this.x + pad,
        y: this.y + pad,
        width: (this.isDucking ? 52 : this.width) - pad * 2,
        height: this.height - pad * 1.5
      };
    }
  };

  // Obstacle Management
  let obstacles = [];

  class Cactus {
    constructor(x, variant) {
      this.x = x;
      this.type = 'cactus';
      this.variant = variant; // 0: small single, 1: double, 2: tall large
      
      if (variant === 0) {
        this.width = 18;
        this.height = 36;
      } else if (variant === 1) {
        this.width = 36;
        this.height = 38;
      } else {
        this.width = 24;
        this.height = 50;
      }
      this.y = (GROUND_Y + dino.standHeight) - this.height;
    }

    update() {
      this.x -= speed;
    }

    draw() {
      ctx.save();
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;

      if (this.variant === 0) {
        // Single Cactus
        ctx.fillRect(this.x + 6, this.y, 8, this.height);
        ctx.fillRect(this.x, this.y + 12, 6, 12);
        ctx.fillRect(this.x + 14, this.y + 8, 6, 12);
      } else if (this.variant === 1) {
        // Double Cactus
        ctx.fillRect(this.x + 4, this.y + 4, 8, this.height - 4);
        ctx.fillRect(this.x, this.y + 14, 5, 10);
        ctx.fillRect(this.x + 22, this.y, 8, this.height);
        ctx.fillRect(this.x + 28, this.y + 10, 5, 12);
      } else {
        // Tall Cactus
        ctx.fillRect(this.x + 8, this.y, 9, this.height);
        ctx.fillRect(this.x, this.y + 16, 8, 14);
        ctx.fillRect(this.x + 16, this.y + 12, 8, 14);
      }
      ctx.restore();
    }

    getHitbox() {
      return {
        x: this.x + 2,
        y: this.y + 2,
        width: this.width - 4,
        height: this.height - 4
      };
    }
  }

  class Pterodactyl {
    constructor(x, heightLevel) {
      this.x = x;
      this.type = 'bird';
      this.width = 38;
      this.height = 26;
      this.flapTick = 0;

      // 0 = duck under, 1 = jump over
      if (heightLevel === 0) {
        this.y = GROUND_Y + dino.standHeight - 56; // must duck or stay low
      } else {
        this.y = GROUND_Y + dino.standHeight - 32; // can jump over
      }
    }

    update() {
      this.x -= speed * 1.15; // slightly faster than ground speed
      this.flapTick++;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;

      const flap = Math.floor(this.flapTick / 8) % 2;

      // Head & Beak
      ctx.fillRect(0, 8, 16, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 10, 6, 4);

      // Body
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(14, 8, 18, 8);
      ctx.fillRect(30, 10, 8, 4); // Tail

      // Wings Flapping
      if (flap === 0) {
        ctx.fillRect(16, 0, 12, 9);
      } else {
        ctx.fillRect(16, 15, 12, 10);
      }

      ctx.restore();
    }

    getHitbox() {
      return {
        x: this.x + 4,
        y: this.y + 4,
        width: this.width - 8,
        height: this.height - 8
      };
    }
  }

  // Clouds and Scenery
  let clouds = [];
  function createCloud(x) {
    return {
      x: x || CANVAS_WIDTH + Math.random() * 200,
      y: 20 + Math.random() * 70,
      width: 46 + Math.random() * 30,
      speed: 0.8 + Math.random() * 0.8
    };
  }

  for (let i = 0; i < 4; i++) {
    clouds.push(createCloud(i * 220 + Math.random() * 50));
  }

  // Ground lines / grid effect
  let groundOffset = 0;

  function spawnObstacle() {
    const minDistance = 280 + speed * 15;
    const canSpawnBird = score > 200 && Math.random() < 0.35;
    
    if (canSpawnBird) {
      const heightLevel = Math.random() < 0.5 ? 0 : 1;
      obstacles.push(new Pterodactyl(CANVAS_WIDTH + 20, heightLevel));
    } else {
      const variant = Math.floor(Math.random() * 3);
      obstacles.push(new Cactus(CANVAS_WIDTH + 20, variant));
    }
  }

  function checkCollision(box1, box2) {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }

  // Floating score text pops
  let floatingTexts = [];
  function addFloatingText(text, x, y) {
    floatingTexts.push({ text, x, y, alpha: 1, vy: -1.5 });
  }

  // Main Loop
  function gameLoop() {
    if (!isPlaying) return;

    // Clear Screen
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update Speed and Score
    score++;
    currentScoreEl.textContent = String(score).padStart(5, '0');

    // Milestones (every 100 points)
    if (score - lastScoreMilestone >= 100) {
      lastScoreMilestone = score;
      soundScore();
      addFloatingText('+100!', dino.x + 20, dino.y - 10);
      speed = Math.min(MAX_SPEED, INITIAL_SPEED + Math.floor(score / 150) * 0.7);
    }

    // High Score tracking
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = String(highScore).padStart(5, '0');
      localStorage.setItem('chrono_dino_hi', highScore);
    }

    // 1. Draw Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x + c.width < 0) {
        Object.assign(c, createCloud());
      }
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.width, 12, 6);
      ctx.fill();
    });

    // 2. Draw Ground
    groundOffset = (groundOffset + speed) % 40;
    const groundLevelY = GROUND_Y + dino.standHeight;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundLevelY);
    ctx.lineTo(CANVAS_WIDTH, groundLevelY);
    ctx.stroke();

    // Ground dots / dash texture
    ctx.fillStyle = '#475569';
    for (let x = -groundOffset; x < CANVAS_WIDTH; x += 32) {
      ctx.fillRect(x, groundLevelY + 4, 12, 2);
      ctx.fillRect(x + 18, groundLevelY + 12, 6, 2);
    }

    // 3. Update & Draw Dino
    dino.update();
    dino.draw();

    // 4. Update & Spawn Obstacles
    lastSpawnDist += speed;
    const nextSpawnDistTarget = 240 + Math.random() * 200 + (10 - speed) * 8;

    if (lastSpawnDist > nextSpawnDistTarget) {
      spawnObstacle();
      lastSpawnDist = 0;
    }

    const dinoHitbox = dino.getHitbox();

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update();
      obs.draw();

      // Check Collision
      if (checkCollision(dinoHitbox, obs.getHitbox())) {
        gameOver();
        return;
      }

      // Remove offscreen
      if (obs.x + obs.width < -50) {
        obstacles.splice(i, 1);
      }
    }

    // 5. Draw Floating Milestone Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      ctx.fillStyle = `rgba(245, 158, 11, ${ft.alpha})`;
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText(ft.text, ft.x, ft.y);
      if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    initAudio();
    isGameOver = false;
    isPlaying = true;
    score = 0;
    lastScoreMilestone = 0;
    speed = INITIAL_SPEED;
    lastSpawnDist = 0;
    obstacles = [];
    floatingTexts = [];
    dino.reset();

    overlay.classList.add('hidden');
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    isPlaying = false;
    isGameOver = true;
    soundHit();

    overlayTitle.textContent = 'GAME OVER';
    overlaySubtitle.textContent = `Score: ${score} | High: ${highScore}`;
    overlayIcon.textContent = '💀';
    actionBtn.textContent = 'PLAY AGAIN';
    overlay.classList.remove('hidden');
  }

  // Initial Welcome Idle Draw
  function drawWelcomeScene() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const groundLevelY = GROUND_Y + dino.standHeight;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundLevelY);
    ctx.lineTo(CANVAS_WIDTH, groundLevelY);
    ctx.stroke();

    // Render standing idle dino
    dino.draw();
  }
  drawWelcomeScene();

  // Keyboard handlers
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (!isPlaying) {
        startGame();
      } else {
        dino.jump();
      }
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      keys.duck = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
      keys.duck = false;
    }
  });

  // Action Button
  actionBtn.addEventListener('click', () => {
    startGame();
  });

  // Canvas click to jump / start
  canvas.addEventListener('pointerdown', () => {
    if (!isPlaying) {
      startGame();
    } else {
      dino.jump();
    }
  });

  // Mobile Touch Controls
  jumpTouchBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isPlaying) startGame();
    else dino.jump();
  });
  jumpTouchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isPlaying) startGame();
    else dino.jump();
  });

  duckTouchBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.duck = true;
  });
  duckTouchBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.duck = false;
  });
  duckTouchBtn.addEventListener('mousedown', () => { keys.duck = true; });
  duckTouchBtn.addEventListener('mouseup', () => { keys.duck = false; });

  // Sound toggle button
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
  });
})();
