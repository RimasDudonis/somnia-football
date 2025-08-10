import { submitToServer, submitToBlockchain, signScoreData, verifyServerSignature, } from "./blockchain.js";
import { images, sounds } from "./resources.js";
import { sendErrorToServer } from "./logger.js";
import { drawScore } from './score.js';
import { drawBackground, drawPlayer, drawBall, drawCrow, drawUFO, drawBrick, drawCat, drawDinoCar, drawTeleport, drawBird }  from './draw.js';
import { setupInput } from "./input.js";
import { canvas, state } from "./state.js";
import { updatePlayer, updateBall, updateCrow, updateUFO, updateBrick, updateCat, updateDinoCar, updateTeleport, updateBird } from './update.js';


const ctx = canvas.getContext("2d");
export const beamYTrigger = 150;
const scoreElement = document.getElementById("score");


document.addEventListener("DOMContentLoaded", () => {
    setupInput(state.keys);
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
        state.soundEnabled = soundToggle.checked;
        soundToggle.addEventListener("change", () => {
            state.soundEnabled = soundToggle.checked;
        });
    }
});

export function playSound(sound) {
    if (state.soundEnabled && sound) {
        sound.currentTime = 0;
        sound.play().catch((e) => {
            console.warn("Sound playback error:", e);
        });
    }
}

export function spawnUFO() {
    state.ufo.state = "entering";
    state.ufo.x = -state.ufo.width;
    state.ufo.y = 50;
    state.ufo.speedX = 3;
    state.ballReleased = false;
    playSound(sounds.ufoNoise);
}

export function spawnCrow() {
  const { crow } = state;

  if (!crow.flying) {
    crow.flying = true;
    crow.x = canvas.width;
    playSound(sounds.crowFly);

    state.brickPlanned = true;
    state.brickTriggerX = Math.random() * (canvas.width - 100) + 50;
  }
}

export function spawnCat() {
  const { cat } = state;
  cat.visible = true;
  cat.x = canvas.width;

  if (state.soundEnabled) {
    sounds.cat.currentTime = 0;
    sounds.cat.play();
  }
}

export function spawnBird() {
  const { bird } = state;
  bird.visible = true;
  bird.x = -bird.width;
}

export function spawnDinoCar() {
  const { dinoCar } = state;
  dinoCar.x = -dinoCar.width;
  dinoCar.y = canvas.height - 450;
  dinoCar.visible = true;
  state.screenShake.active = true;
  state.screenShake.timer = state.screenShake.duration;

  dinoCar.frame = 0;
  dinoCar.frameTimer = 0;

  if (state.soundEnabled) {
    sounds.dinoCar.currentTime = 0;
    sounds.dinoCar.play();
  }
}

export function spawnTeleport() {
  const { teleport } = state;

  teleport.x = Math.random() * (canvas.width - teleport.width);

  teleport.visible = true;
  teleport.active = true;
  teleport.frame = 0;
  teleport.frameTimer = 0;
  teleport.respawnTimer = 0;
}

function draw() {
    if (state.isGameOver) return;

    if (state.screenShake.active && state.screenShake.timer > 0) {
      const dx = (Math.random() - 0.5) * 2 * state.screenShake.intensity;
      const dy = (Math.random() - 0.5) * 2 * state.screenShake.intensity;
      ctx.save();
      ctx.translate(dx, dy);

      state.screenShake.timer--;
      if (state.screenShake.timer <= 0) {
        state.screenShake.active = false;
      }
    } else {
      ctx.save();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(ctx, canvas, images);
    drawPlayer(ctx, state.player, state.playerState, images);
    drawDinoCar(ctx, state.dinoCar, images)
    drawCat(ctx, state.cat, images);
    drawBird(ctx, state.bird, images);
    drawTeleport(ctx, state.teleport, images);
    drawBall(ctx, state.ball, images);
    drawCrow(ctx, state.crow, images);
    drawUFO(ctx, state.ufo, state.ball, canvas, images);
    drawBrick(ctx, state.brick, images);
    drawScore(ctx, canvas, state.score);

    updatePlayer();
    updateBall();
    updateCrow();
    updateUFO();
    updateBrick();
    updateCat();
    updateDinoCar();
    updateTeleport();
    updateBird();

    ctx.restore();

    if (!state.isGameOver) {
        state.animationFrameId = requestAnimationFrame(draw);
    }
}

export async function startGameLogic() {
  state.isGameOver = false;

  try {
    const name = localStorage.getItem("playerAddress") || "Unknown";

    const response = await fetch("/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await sendErrorToServer(new Error("Server error when starting the game."), {
        location: "startSession - server response",
        status: response.status,
        responseText: errorText,
      });
      throw new Error("Server error when starting the game.");
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const rawText = await response.text();
      await sendErrorToServer(jsonError, {
        location: "startSession - JSON parse",
        rawResponse: rawText,
      });
      throw new Error("Server returned invalid JSON.");
    }

    state.currentSessionId = data.sessionId;
  } catch (error) {
    await sendErrorToServer(error, { location: "startSession - general catch" });
    return;
  }

  state.animationFrameId = requestAnimationFrame(draw);
}

export function showResult(score) {
  const oldResult = document.querySelector(".game-result");
  if (oldResult) oldResult.remove();

  const resultDiv = document.createElement("div");
  resultDiv.className = "game-result";
  resultDiv.textContent = `Game Over! Your score: ${score}`;
  document.body.appendChild(resultDiv);
}

export async function gameOver(hits) {
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  state.isGameOver = true;
  playSound(sounds.gameOver, state.soundVolume);

  const playerAddress = localStorage.getItem("playerAddress");

  if (!playerAddress || !state.currentSessionId) {
    showResult(hits);
    setTimeout(() => location.reload(), 3000);
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signatureData = await signScoreData(hits, state.currentSessionId, signer);
    const serverResponse = await submitToServer(hits, state.currentSessionId, signatureData);
    const { score, timestamp, signature, trusted } = serverResponse;
    const validatedScore = score;


    if (!verifyServerSignature(score, playerAddress, timestamp, signature, trusted)) {
      const error = new Error("Server signature is invalid");
      await sendErrorToServer(error, { location: "verifyServerSignature check" });
      throw error;
    }

    if (typeof validatedScore !== "number" || !Number.isFinite(validatedScore) || validatedScore > hits) {
    const error = new Error("Anticheat radar: invalid score");
    await sendErrorToServer(error, {
      location: "checkSignatureAndScore",
      details: {
        validatedScore,
        hits
      }
    });
    throw error;
    }

    await submitToBlockchain(validatedScore, playerAddress, timestamp, signature, trusted)
    showResult(validatedScore);
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    await sendErrorToServer(error, { location: "submitToBlockchain"});
    if (error.message.includes("Anticheat radar")) {
      alert("Anticheat radar triggered! Your score was rejected.");
    } else {
      alert("Error submitting score. Please try again later.");
    }

    showResult(hits);
    setTimeout(() => location.reload(), 3000);
  }
}