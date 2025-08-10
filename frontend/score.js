export function drawScore(ctx, canvas, score) {
    const paddingX = 10;
    const paddingY = 5;
    const text = `Score: ${score}`;

    ctx.font = "24px Arial";
    ctx.textBaseline = "top";

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 24;

    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;

    const x = canvas.width - boxWidth - 10;
    const y = 10;

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    const radius = 8;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxWidth - radius, y);
    ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
    ctx.lineTo(x + boxWidth, y + boxHeight - radius);
    ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius, y + boxHeight);
    ctx.lineTo(x + radius, y + boxHeight);
    ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText(text, x + paddingX, y + paddingY);
}