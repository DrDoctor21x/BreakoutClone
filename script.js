canvas = document.querySelector("canvas");
window.onload = reportWindowSize;
window.onresize = reportWindowSize;

ctx = canvas.getContext("2d");
document.addEventListener("keyup", onKeyUp);
document.addEventListener("keydown", onKeyDown);

document.querySelector("#playButton").onclick = function () {
	closePopup();
};
document.querySelector("canvas").onclick = function () {
	canvas.requestPointerLock();
};

document.addEventListener("pointerlockchange", lockChangeAlert, false);

function reportWindowSize() {
	canvas.width = document.querySelector(".canvasArea").clientWidth;
	canvas.height = document.querySelector(".canvasArea").clientHeight * 0.75;
}

function lockChangeAlert() {
	if (document.pointerLockElement === canvas) {
		document.addEventListener("mousemove", onMouseMove, false);
	} else {
		document.removeEventListener("mousemove", onMouseMove, false);
	}
}

var playerName;
var lives = 3;
var isPaused;
var lifeCounter;
var scoreCounter;
var isInitialized = false;
var startMS;
var timer;
var timeInterval;
var scoreTimer;

var hit = new Audio("sounds/hit.wav");
var destroy = new Audio("sounds/destroy.wav");
var win = new Audio("sounds/win.wav");
var life = new Audio("sounds/life.wav");
var audioArr = [hit, destroy, win, life];

var savedScores = JSON.parse(window.localStorage.getItem("savedScores")) || [];

function init() {
	if (!isInitialized) {
		updateScoreboardElement();
		canvas.requestPointerLock();
		isPaused = false;
		playerName = document.querySelector("#playerName").value;
		lifeCounter = lives;
		scoreCounter = 0;
		scoreTimer = Date.now();
		startMS = Date.now();
		container = new BrickContainer(6, 6, canvas.height / 3, canvas.height / 40);
		paddle = new Paddle(canvas.width / 5, canvas.height / 40, canvas.height / 40);
		ball = new Ball(container.cellHeight / 2, canvas.height / 100);
		container.populateContainer(3);
		isInitialized = true;
		document.querySelector(".startOverlay").style.display = "none";
		document.querySelector("#lives").innerHTML = "LIVES : " + lifeCounter;
		document.querySelector("#score").innerHTML = "SCORE : " + scoreCounter;
		window.requestAnimationFrame(gameCounter);
	}
}

function updateTimer() {
	document.querySelector("#timer").innerHTML = "TIME: " + Number(Math.round((Date.now() - startMS) / 1000 + "e1") + "e-1") + " s";
	if (Date.now() - scoreTimer >= 1300) {
		console.log(Date.now() - scoreTimer);
		scoreTimer = Date.now();
		scoreCounter -= 10;
	}
}

function gameCounter() {
	document.querySelector("#score").innerHTML = "SCORE : " + scoreCounter;
	toggleMusic();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	paddle.checkForCollisions();
	container.checkCollisions();
	paddle.drawPaddle();
	container.drawBricks();
	ball.drawBall();

	if (container.checkForWin()) {
		isInitialized = false;
		win.play();
		window.cancelAnimationFrame(timer);
		updateScoreboard();
		showEndScreen(true);
	} else if (lifeCounter <= 0) {
		isInitialized = false;

		updateScoreboard();
		window.cancelAnimationFrame(timer);
		showEndScreen(false);
	} else if (!isPaused) {
		updateTimer();
		timer = window.requestAnimationFrame(gameCounter);
	}
}
class BrickContainer {
	constructor(columns, rows, height, gap) {
		this.columns = columns;
		this.rows = rows;
		this.height = height;
		this.width = canvas.width;
		this.gap = gap;
		this.brickArray = [];
		this.cellHeight = (this.height - (this.rows + 1) * this.gap) / this.rows;
		this.cellWidth = (this.width - (this.columns + 1) * this.gap) / this.columns;

		this.currentX = this.gap;
		this.currentY = this.gap;
	}
	populateContainer(maxLevel) {
		for (let i = 0; i < this.rows; i++) {
			let temp = [];
			for (let j = 0; j < this.columns; j++) {
				if (maxLevel > 0) {
					if (Math.random() < 0.5) {
						temp.push(new Brick(Math.floor(Math.random() * maxLevel + 1)));
					} else {
						temp.push(new Brick(1));
					}
				} else {
					temp.push(new Brick(this.rows - i));
				}
			}
			this.brickArray.push(temp);
		}
	}
	drawBricks() {
		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.columns; j++) {
				container.brickArray[i][j].x = this.currentX;
				container.brickArray[i][j].y = this.currentY;
				if (container.brickArray[i][j].enabled) {
					switch (container.brickArray[i][j].level) {
						case 1:
							ctx.fillStyle = "#BF4736";
							break;
						case 2:
							ctx.fillStyle = "#863226";
							break;
						case 3:
							ctx.fillStyle = "#391510";
							break;
						default:
							ctx.fillStyle = "#FFFFFF";
							break;
					}
					//ctx.fillStyle = "#" + Math.random().toString(16).substr(-6);
					ctx.fillRect(this.currentX, this.currentY, this.cellWidth, this.cellHeight);
				}

				this.currentX += this.cellWidth + this.gap;
			}
			this.currentY += this.cellHeight + this.gap;
			this.currentX = this.gap;
		}
		this.currentX = this.gap;
		this.currentY = this.gap;
	}
	checkCollisions() {
		for (let i = 0; i < this.brickArray.length; i++) {
			for (let j = 0; j < this.brickArray[0].length; j++) {
				this.brickArray[i][j].checkCollision();
			}
		}
	}
	checkForWin() {
		let count = 0;
		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.columns; j++) {
				if (this.brickArray[i][j].enabled) count++;
			}
		}
		if (count > 0) return false;
		return true;
	}
}
class Brick {
	constructor(level) {
		this.level = level;
		this.x;
		this.y;
		this.enabled = true;
	}
	checkCollision() {
		if (this.enabled && !ball.hasCollided) {
			if (ball.y - ball.dia < this.y + container.cellHeight && ball.y + ball.dia > this.y) {
				if (ball.x + ball.dia > this.x && ball.x - ball.dia < this.x + container.cellWidth) {
					ball.hasCollided = true;
					setTimeout((ball.hasCollided = false), 150);
					let centerX = this.x + container.cellWidth / 2;
					let centerY = this.y + container.cellHeight / 2;
					let offsetX = Math.abs(ball.x - centerX);
					let offsetY = Math.abs(ball.y - centerY);
					let rand;
					rand = Math.random() * 4 + ball.step;
					if (offsetY / container.cellHeight > offsetX / container.cellWidth) {
						ball.dy = ball.dy < 0 ? rand : rand * -1;
						if (ball.y - centerY < 0) {
							ball.y = this.y - ball.dia;
						} else {
							ball.y = this.y + ball.dia + container.cellHeight;
						}
						ball.y += ball.dy;
					} else if (offsetY / container.cellHeight < offsetX / container.cellWidth) {
						ball.dx = ball.dx < 0 ? rand : rand * -1;

						if (ball.x - centerX < 0) {
							ball.x = this.x - ball.dia;
						} else {
							ball.x = this.x + ball.dia + container.cellWidth;
						}
						ball.x += ball.dx;
					} else {
						ball.dy = ball.dy < 0 ? rand : rand * -1;
						ball.dx = ball.dx < 0 ? rand : rand * -1;
					}

					this.level -= 1;
					scoreCounter += 20;
					document.querySelector("#score").innerHTML = "SCORE : " + scoreCounter;
					hit.play();
				}
			}
			if (this.level <= 0) {
				scoreCounter += 40;
				document.querySelector("#score").innerHTML = "SCORE : " + scoreCounter;
				destroy.play();
				this.enabled = false;
			}
		}
	}
}

class Ball {
	constructor(dia, step) {
		this.dia = dia;
		this.dx = step;
		this.dy = step * -1;
		this.step = step;
		this.x = canvas.width / 2;
		this.y = canvas.height - this.dia - paddle.height;
		this.hasCollided = false;
	}
	drawBall() {
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.dia, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fillStyle = "#49bf88";
		ctx.fill();
		/* 		ctx.beginPath();
				ctx.lineWidth = 5;
				ctx.strokeStyle = "#BFE04A";
				ctx.arc(this.x, this.y, this.dia, 0, Math.PI * 2, true);
				ctx.stroke(); */
		this.x += this.dx;
		this.y += this.dy;
		let rand;
		rand = Math.random() * 4 + this.step;
		if (this.y >= canvas.height - this.dia || this.y <= this.dia) {
			this.dy = this.dy < 0 ? rand : rand * -1;
			checkForFails();
			this.y += this.dy * 2;
		}
		if (this.x >= canvas.width - this.dia || this.x <= this.dia) {
			this.dx = this.dx < 0 ? rand : rand * -1;
			this.x += this.dx * 2;
		}
	}
}
class Paddle {
	constructor(width, height, step) {
		this.width = width;
		this.height = height;
		this.step = step;
		this.x = canvas.width / 2 - width / 2;
		this.y = canvas.height - this.height;
		this.rightDown = false;
		this.leftDown = false;
		this.xUpdate = 0;
	}
	drawPaddle() {
		ctx.fillStyle = "#49bf88";
		if (this.rightDown && this.x <= canvas.width - this.width) {
			this.x += this.step;
		}
		if (this.leftDown && this.x > 0) {
			this.x -= this.step;
		}

		ctx.fillRect(this.x, canvas.height - this.height, this.width, this.height);
	}
	checkForCollisions() {
		let rand;
		if (ball.y + ball.dia > this.y) {
			if (ball.x + ball.dia > this.x && ball.x - ball.dia < this.x + this.width) {
				rand = Math.random() * 4 + ball.step;

				if (paddle.leftDown) {
					ball.dx = rand * -1;
				} else if (paddle.rightDown) {
					ball.dx = rand;
				} else {
					paddle.xUpdate *= 0.1;
					let xUpdateThreshold = 3;
					if (!(paddle.xUpdate >= -xUpdateThreshold && paddle.xUpdate <= xUpdateThreshold)) ball.dx = paddle.xUpdate;
				}

				ball.dy = ball.dy * -1;
				ball.y = canvas.height - this.height - ball.dia;
			}
		}
	}
}

function onKeyDown(evt) {
	if (evt.keyCode == 39) {
		paddle.rightDown = true;
		paddle.xUpdate = paddle.step;
	}
	if (evt.keyCode == 37) {
		paddle.leftDown = true;
		paddle.xUpdate = paddle.step * -1;
	}
	if (evt.keyCode == 32 && document.querySelector(".overlay").style.display == "none") {
		init();
		hideEndScreen();
	}
}

function onKeyUp(evt) {
	if (evt.keyCode == 39) paddle.rightDown = false;

	if (evt.keyCode == 37) paddle.leftDown = false;
}

function onMouseMove(evt) {
	paddle.x += evt.movementX;
	paddle.xUpdate = evt.movementX;
	if (paddle.x >= canvas.width - paddle.width) {
		paddle.x = canvas.width - paddle.width;
	}
	if (paddle.x <= 0) {
		paddle.x = 0;
	}
}

function checkForFails() {
	if (ball.y + ball.dia >= canvas.height) {
		lifeCounter--;
		scoreCounter -= 20;
		life.play();
		document.querySelector("#lives").innerHTML = "LIVES : " + lifeCounter;
		document.querySelector("#score").innerHTML = "SCORE : " + scoreCounter;
	}
}

function showEndScreen(hasWon) {
	document.exitPointerLock();
	document.querySelector(".startOverlay").style.display = "flex";

	updateScoreboardElement();
	if (hasWon) {
		document.querySelector("#endMessage").innerHTML = "YOU WIN!</br> FINAL SCORE: " + scoreCounter;
	} else {
		document.querySelector("#endMessage").innerHTML = "YOU LOSE!</br> FINAL SCORE: " + scoreCounter;
	}
	let endscreen = document.querySelector(".endscreen");
	endscreen.style.transform = "translate(-50%, -50%) scale(1)";
	let overlay = document.querySelector(".overlay");
	overlay.style.display = "block";
}

function hideEndScreen() {
	let endscreen = document.querySelector(".endscreen");
	endscreen.style.transform = "translate(-50%, -50%) scale(0)";
	let overlay = document.querySelector(".overlay");
	overlay.style.display = "none";
}

function closePopup() {
	let popup = document.querySelector(".popup");
	let overlay = document.querySelector(".overlay");
	popup.style.transform = "translate(-50%, -50%) scale(0)";
	overlay.style.display = "none";
}
function toggleMusic() {
	audioArr.forEach((element) => {
		element.muted = !document.querySelector(".switch input").checked;
	});
}
function updateScoreboard() {
	let tempScore;
	let isLast = true;
	if (playerName.length > 10) playerName = playerName.substring(0, 10);
	if (playerName.trim() != "") {
		/* scoreCounter = scoreCounter - Math.round((Date.now() - startMS) / 100) + lifeCounter * 100; */
		for (let i = 0; i < savedScores.length; i++) {
			tempScore = savedScores[i].split("&nbsp;");
			if (scoreCounter >= tempScore[1]) {
				savedScores.splice(i, 0, playerName + "&nbsp;" + scoreCounter);
				isLast = false;
				break;
			}
		}
		if (savedScores.length == 0 || isLast) {
			savedScores.push(playerName + "&nbsp;" + scoreCounter);
		}
		localStorage.setItem("savedScores", JSON.stringify(savedScores));
	}
}
function updateScoreboardElement() {
	let el = document.querySelector(".scoreboard");
	el.innerHTML = "";
	for (let i = 0; i < savedScores.length; i++) {
		if (i < 40) {
			el.innerHTML = el.innerHTML + savedScores[i] + "<br />";
		} else if (i >= 40) {
			el.innerHTML = el.innerHTML + ". . ." + "<br />";
			break;
		}
	}
}
