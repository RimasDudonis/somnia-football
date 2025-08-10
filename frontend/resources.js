export const images = {
  brick: new Image(),
  playerIdle: new Image(),
  playerKickLeft: new Image(),
  playerKickRight: new Image(),
  ball: new Image(),
  background: new Image(),
  playerMoveLeft: new Image(),
  playerMoveRight: new Image(),
  crowUp: new Image(),
  crowDown: new Image(),
  ufo: new Image(),
  cat1: new Image(),
  cat2: new Image(),
  dinoCar1: new Image(),
  dinoCar2: new Image(),
  bird1: new Image(),
  bird2: new Image(),
  teleportFrames: [new Image(), new Image(), new Image(), new Image(), new Image()],
};

images.brick.src = "static/images/brick.png";
images.playerIdle.src = "static/images/player_idle.png";
images.playerKickLeft.src = "static/images/player_kick_left.png";
images.playerKickRight.src = "static/images/player_kick_right.png";
images.ball.src = "static/images/ball.png";
images.background.src = "static/images/background.png";
images.playerMoveLeft.src = "static/images/player_move_left.png";
images.playerMoveRight.src = "static/images/player_move_right.png";
images.crowUp.src = "static/images/crow_up.png";
images.crowDown.src = "static/images/crow_down.png";
images.ufo.src = "static/images/ufo.png";
images.cat1.src = "static/images/cat1.png";
images.cat2.src = "static/images/cat2.png";
images.dinoCar1.src = "static/images/dino_car1.png";
images.dinoCar2.src = "static/images/dino_car2.png";
images.bird1.src = "static/images/bird1.png";
images.bird2.src = "static/images/bird2.png";
images.teleportFrames[0].src = "static/images/teleport/teleport_0.png";
images.teleportFrames[1].src = "static/images/teleport/teleport_1.png";
images.teleportFrames[2].src = "static/images/teleport/teleport_2.png";
images.teleportFrames[3].src = "static/images/teleport/teleport_3.png";
images.teleportFrames[4].src = "static/images/teleport/teleport_4.png";

export const sounds = {
  kick: new Audio("static/sounds/kick.mp3"),
  bounce: new Audio("static/sounds/bounce.mp3"),
  gameOver: new Audio("static/sounds/gameOver.mp3"),
  crowFly: new Audio("static/sounds/crow_fly.mp3"),
  ufoNoise: new Audio("static/sounds/ufo_noise.mp3"),
  dinoCar: new Audio("static/sounds/dinoCar.mp3"),
  cat: new Audio("static/sounds/cat.mp3"),
};