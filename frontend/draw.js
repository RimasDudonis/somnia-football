export function drawBrick(ctx, brick, images) {
    if (brick.active) {
        ctx.drawImage(images.brick, brick.x, brick.y, brick.width, brick.height);
    }
}

export function drawBackground(ctx, canvas, images) {
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
}

export function drawPlayer(ctx, player, playerState, images) {
    let img;
    if (playerState === "kick_left") img = images.playerKickLeft;
    else if (playerState === "kick_right") img = images.playerKickRight;
    else if (playerState === "move_left") img = images.playerMoveLeft;
    else if (playerState === "move_right") img = images.playerMoveRight;
    else img = images.playerIdle;

    ctx.drawImage(img, player.x, player.y, player.width, player.height);
}

export function drawBall(ctx, ball, images) {
    if (!ball.visible) return;
    ctx.drawImage(images.ball, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);
}

export function drawCrow(ctx, crow, images) {
  const image = crow.frame === 0 ? images.crowUp : images.crowDown;
  ctx.drawImage(image, crow.x, crow.y, crow.width, crow.height);
}

export function drawUFO(ctx, ufo, ball, canvas, images) {
    if (ufo.state !== "hidden") {
        ctx.drawImage(images.ufo, ufo.x, ufo.y, ufo.width, ufo.height);

        if (ufo.state === "beam") {
            ctx.beginPath();
            ctx.moveTo(ufo.x + ufo.width / 2, ufo.y + ufo.height);
            ctx.lineTo(ufo.x + ufo.width / 2, canvas.height);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 25;
            ctx.stroke();
        }
    }
}

export function drawCat(ctx, cat, images) {
  if (!cat.visible) return;

  const image = cat.frame === 0 ? images.cat1 : images.cat2;
  ctx.drawImage(image, cat.x, cat.y, cat.width, cat.height);
}

export function drawBird(ctx, bird, images) {
  if (!bird.visible) return;

  const image = bird.frame === 0 ? images.bird1 : images.bird2;
  ctx.drawImage(image, bird.x, bird.y, bird.width, bird.height);
}

export function drawDinoCar(ctx, dinoCar, images) {
  if (!dinoCar.visible) return;

  const image = dinoCar.frame === 0 ? images.dinoCar1 : images.dinoCar2;
  ctx.drawImage(image, dinoCar.x, dinoCar.y, dinoCar.width, dinoCar.height);
}

export function drawTeleport(ctx, teleport, images) {
  if (!teleport.visible) return;

  const frames = images.teleportFrames;
  if (!frames || frames.length === 0) return;

  const frameIndex = teleport.frame;
  if (typeof frameIndex !== "number" || frameIndex < 0 || frameIndex >= frames.length) return;

  const frameImage = frames[frameIndex];
  if (!frameImage.complete) return;

  ctx.drawImage(frameImage, teleport.x, teleport.y, teleport.width, teleport.height);
}
