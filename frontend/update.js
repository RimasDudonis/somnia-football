import { state, canvas } from "./state.js";
import { sounds } from "./resources.js";
import { gameOver, playSound, spawnUFO, spawnCrow, spawnCat, spawnDinoCar, spawnTeleport, spawnBird, beamYTrigger } from "./game.js";

export function updateBall() {
  const { ball, player, crow, scoreElement } = state;

  if (!canvas) return;

  if (!ball.visible) {
    return;
  }

  if (!state.ballCapturedByBeam) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += ball.gravity;
  } else {
    ball.y += ball.vy;
  }

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius + 1;
    ball.vx = Math.abs(ball.vx) || 2;
    playSound(sounds.bounce);
  }

  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius - 1;
    ball.vx = -Math.abs(ball.vx) || -2;
    playSound(sounds.bounce);
  }

  const playerCenter = player.x + player.width / 2;
  const isAligned = Math.abs(ball.x - playerCenter) <= 50;

  if (ball.y + ball.radius >= canvas.height - 10) {
    if (isAligned) {
      let offset = (ball.x - playerCenter) / (player.width / 2);
      if (Math.abs(offset) < 0.05) {
        offset = (Math.random() < 0.5 ? -1 : 1) * 0.2;
      }

      ball.vy = ball.bounce;
      ball.vx = offset * 3.5;

      state.playerState = offset < 0 ? "kick_left" : "kick_right";
      clearTimeout(state.kickTimeout);
      state.kickTimeout = setTimeout(() => {
        state.playerState = "idle";
      }, 150);

      playSound(sounds.kick);
      state.kickCount++;
      state.score++;
      if (scoreElement) scoreElement.textContent = `Score: ${state.score}`;

      if (state.kickCount > 0 && state.kickCount % 15 === 0) {
        triggerRandomPlayerEvent();
      }

      if (state.kickCount > 0 && state.kickCount % 10 === 0) {
        triggerRandomNeutralEvent();
      }

    } else if (!state.isGameOver) {
      state.isGameOver = true;
      gameOver(state.score);
    }
  }
}

export function updatePlayer() {
  const { keys, player } = state;

  if (!canvas) return;

  if (keys.left && player.x > 0) {
    player.x -= player.speed;
    if (!["kick_left", "kick_right"].includes(state.playerState)) {
      state.playerState = "move_left";
    }
  } else if (keys.right && player.x + player.width < canvas.width) {
    player.x += player.speed;
    if (!["kick_left", "kick_right"].includes(state.playerState)) {
      state.playerState = "move_right";
    }
  } else {
    if (!["kick_left", "kick_right"].includes(state.playerState)) {
      state.playerState = "idle";
    }
  }
}

export function updateCrow() {
  const { crow, brick } = state;

  if (!canvas) return;

  if (crow.flying) {
    crow.x -= crow.flySpeed;

    crow.frameTimer++;
    if (crow.frameTimer >= crow.frameInterval) {
      crow.frame = 1 - crow.frame;
      crow.frameTimer = 0;
    }

    if (state.brickPlanned && !brick.active && crow.x < state.brickTriggerX) {
      brick.active = true;
      brick.x = crow.x + crow.width / 2 - brick.width / 2;
      brick.y = crow.y + crow.height;
      state.brickDropDelay = Math.floor(Math.random() * 15 + 5);
      state.brickPlanned = false;
    }

    if (crow.x < -crow.width) {
      crow.x = canvas.width;
      crow.flying = false;
      state.playerEventActive = false;
      state.currentEvent = null;

      if (!brick.active) {
        brick.active = true;
        brick.x = crow.x + crow.width / 2 - brick.width / 2;
        brick.y = crow.y + crow.height;
        state.brickDropDelay = Math.floor(Math.random() * 60 + 30);
      }
    }
  }
}

export function updateBrick() {
  if (state.isGameOver || !state.brick.active || !canvas) return;

  if (state.brickDropDelay > 0) {
    state.brickDropDelay--;
  } else {
    state.brick.y += state.brick.vy;

    const b = state.brick;
    const p = state.player;

    if (
      b.y + b.height > p.y &&
      b.y < p.y + p.height &&
      b.x + b.width > p.x &&
      b.x < p.x + p.width
    ) {
      state.isGameOver = true;
      gameOver(state.score);
    }

    if (b.y > canvas.height) {
      b.active = false;
    }
  }
}

export function updateUFO() {
  const { ufo, ball } = state;

  if (!canvas) return;

  if (ufo.state === "entering") {
    ufo.x += ufo.speedX;
    if (ufo.x >= canvas.width / 2 - ufo.width / 2) {
      ufo.state = "paused";
      ufo.pauseTime = 5 * 60;
    }
  }

  if (ufo.state === "paused") {
    ufo.pauseTime--;
    if (ufo.pauseTime <= 0) {
      ufo.state = "beam";
      ufo.beamTime = 4 * 60;
    }
  }

  if (ufo.state === "beam") {
    const beamX = ufo.x + ufo.width / 2;
    const beamTop = ufo.y + ufo.height;
    const beamBottom = canvas.height;

    const inBeamHorizontally = Math.abs(ball.x - beamX) < 30;
    const inBeamVertically = ball.y + ball.radius > beamTop && ball.y - ball.radius < beamBottom;
    const ballInBeam = inBeamHorizontally && inBeamVertically;

    if (ballInBeam && !state.ballCapturedByBeam) {
      state.ballCapturedByBeam = true;
      state.ballReleased = false;
      ball.vx = 0;
      ball.vy = -3;
    }

    if (state.ballCapturedByBeam && ball.y <= beamYTrigger && !state.ballReleased) {
      state.ballCapturedByBeam = false;
      state.ballReleased = true;

      const angle = (Math.random() - 0.5) * (Math.PI / 2);
      const speed = 6;
      ball.vx = speed * Math.sin(angle);
      ball.vy = speed * Math.cos(angle);
    }

    if (!state.ballReleased && ballInBeam && ufo.beamTime < 30) {
       ufo.beamTime = 30;
    }

    ufo.beamTime--;


    if (ufo.beamTime <= 0) {
      const beamStillHoldingBall = state.ballCapturedByBeam && !state.ballReleased;

      if (!beamStillHoldingBall) {
        ufo.state = "leaving";
      } else {
        ufo.beamTime = 30;
      }
    }
  }

  if (ufo.state === "leaving") {
    ufo.y -= 2;
    if (ufo.y + ufo.height < 0) {
      ufo.state = "hidden";
      ufo.x = -100;
      ufo.y = 50;
      sounds.ufoNoise.pause();
      sounds.ufoNoise.currentTime = 0;

      state.playerEventActive = false;
      state.currentEvent = null;
    }
  }
}

export function updateCat() {
  const { cat } = state;
  if (!canvas || !cat.visible) return;

  cat.x -= cat.speed;

  cat.frameTimer++;
  if (cat.frameTimer >= cat.frameInterval) {
    cat.frame = 1 - cat.frame;
    cat.frameTimer = 0;
  }

  if (cat.x + cat.width < 0) {
    cat.visible = false;
    cat.x = canvas.width;
    state.neutralEventActive = false;
  }
}

export function updateBird() {
  const { bird } = state;
  if (!canvas || !bird.visible) return;

  bird.x += bird.speed;

  bird.frameTimer++;
  if (bird.frameTimer >= bird.frameInterval) {
    bird.frame = 1 - bird.frame;
    bird.frameTimer = 0;
  }

  if (bird.x > canvas.width) {
    bird.visible = false;
    bird.x = -bird.width;
    state.neutralEventActive = false;
  }
}

export function updateDinoCar() {
  const { dinoCar } = state;
  if (!canvas || !dinoCar.visible) return;

  dinoCar.x += dinoCar.speed;

  dinoCar.frameTimer++;
  if (dinoCar.frameTimer >= dinoCar.frameInterval) {
    dinoCar.frame = 1 - dinoCar.frame;
    dinoCar.frameTimer = 0;
  }

  if (dinoCar.x > canvas.width) {
    dinoCar.visible = false;
    dinoCar.x = -dinoCar.width;
    state.neutralEventActive = false;
  }
}

export function updateTeleport() {
  const tp = state.teleport;
  const ball = state.ball;

  if (tp.visible) {
    tp.frameTimer = (tp.frameTimer || 0) + 1;
    if (tp.frameInterval === undefined) tp.frameInterval = 5;

    if (tp.frameTimer >= tp.frameInterval) {
      tp.frame = (tp.frame + 1) % 5;
      tp.frameTimer = 0;
    }

    if (tp.timer == null) tp.timer = 240;
    tp.timer--;

    if (tp.timer <= 0) {
      tp.visible = false;
      tp.active = false;
      tp.timer = null;
      state.playerEventActive = false;
      return;
    }

    const ballHitsTeleport =
      tp.active &&
      ball.visible &&
      ball.x + ball.radius > tp.x &&
      ball.x - ball.radius < tp.x + tp.width &&
      ball.y + ball.radius > tp.y &&
      ball.y - ball.radius < tp.y + tp.height;

    if (ballHitsTeleport) {
      tp.visible = false;
      tp.active = false;
      tp.respawnTimer = 150;
      tp.timer = null;

      ball.visible = false;
      tp.ballPendingRespawn = true;
      return;
    }
  }

  if (!tp.visible && tp.respawnTimer > 0) {
    tp.respawnTimer--;

    if (tp.respawnTimer === 0) {
      tp.x = Math.random() * (canvas.width - tp.width);
      tp.y = canvas.height - 550;
      tp.visible = true;
      tp.active = true;
      tp.frame = 0;
      tp.frameTimer = 0;
      tp.timer = 240;
      tp.justRespawned = true;
    }
  }

  if (tp.visible && tp.justRespawned && tp.ballPendingRespawn) {
    ball.x = tp.x + tp.width / 2;
    ball.y = tp.y + tp.height + ball.radius;

    const angle = (Math.random() - 0.5) * 0.8;
    ball.vx = angle * 10;
    ball.vy = 5;

    ball.visible = true;

    tp.justRespawned = false;
    tp.ballPendingRespawn = false;
  }
}

function triggerRandomPlayerEvent() {
  if (state.playerEventActive) return;
  const event = state.playerEvents[Math.floor(Math.random() * state.playerEvents.length)];

  if (event === "ufo") spawnUFO();
  if (event === "crow") spawnCrow();
  if (event === "teleport") spawnTeleport();

  state.playerEventActive = true;
  state.currentEvent = event;
}

function triggerRandomNeutralEvent() {
  if (state.neutralEventActive) return;
  const event = state.neutralEvents[Math.floor(Math.random() * state.neutralEvents.length)];

  if (event === "cat") spawnCat();
  if (event === "dinoCar") spawnDinoCar();
  if (event === "bird") spawnBird();

  state.neutralEventActive = true;
}
