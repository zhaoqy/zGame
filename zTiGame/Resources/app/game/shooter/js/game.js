/**
* Created by zhaoqy on 2012-9-18.
**/
var GAME_MSG = {
	replay : '重来',
	score : '得分: ',
	newScore : '当前最新得分 ',
	highestScore : '以前最高得分 ',
	historyScore : '你的最高得分是 '
};

var STYLE = {
	score : {
		color : '#40AA53',
		font : 'bold 30px Arial Helvetica sans-serif quartz MS'
	},
	gameover : {
		color : '#40AA53',
		font : 'bold 25px Arial Helvetica sans-serif quartz MS'
	}
};

var CANVAS_WIDTH = 320;
var CANVAS_HEIGHT = 480;

var player = Player();
var playerBullets = [];
var enemies = [];

var sky = new Image();
sky.src = "images/scrollingbg.png";
var skyy = 0, skydy = 0.5;
var FPS = 40;
var gameLoop = 0;
var playerScore = 0;
var tiltMoveX = 0;
var tiltMoveY = 0;

var gameOverImg = new Image();
gameOverImg.src = "images/game_over.png";
var tapToShoot = 0;
var highScoreFlag = 0;
var oldScore = 0;
var highScore = 0;

// Create Game Canvas
var canvasElement = $("<canvas id ='gameCanvas' width='" + CANVAS_WIDTH + 
					  "' height='" + CANVAS_HEIGHT + "'></canvas>");
var canvas = canvasElement.get(0).getContext("2d");
//show canvas
function appendCanvas(){
	canvasElement.appendTo('body');
}
appendCanvas();
//init canvas
function gameInit (e) {
	canvas.height = e.height;
	canvas.width = e.width;
	highScore = e.highScore;
}
function startGame(e) {	  
	if(e.start){	
		startGameLoop();	
	}
}
//save Score
function setHighScore (highScore) {
	Ti.App.fireEvent('Game_Shooter_HighScore',{
		highScore : highScore
	});
}
Titanium.App.addEventListener("Game_Shooter_Start", startGame);
Titanium.App.addEventListener("Game_Shooter_Init", gameInit);
Titanium.App.addEventListener("Game_Shooter_Paused", gameInit);

window.onunload = function(){
	Titanium.App.removeEventListener("Game_Shooter_Init", gameInit);
	Titanium.App.removeEventListener("Game_Shooter_Start", startGame);
	Titanium.App.removeEventListener("Game_Shooter_Paused", startGame);
};

var autoFireInt = 0;
autoFireInt = setInterval(function(){
	canvasElement.trigger("click");
}, 1000);
//Game Start
function startGameLoop() {
	//Auto fire
	if(player) {
		if(!player.active) {
			// If the game is over, reset it
			playerScore = 0;
			player.x = 220;
			player.y = 370;
			player.multishot = false;
			skyy = 1;
			player.active = true;
			enemies.forEach(function(enemy) {
				enemy.active = false;
			});
			playerBullets.forEach(function(bullet) {
				bullet.active = false;
			});
		}
	}
	// Start the game loop
	gameLoop = setInterval(function() {
		update();
		draw();
		}, 1000/FPS);
	
}


// Clamp definition, keeps items on screen
Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};

function update() {
	//*** Controls Section ***
	// Firing
	if (keydown.space || (tapToShoot === 1)) {
		if(!player.charging){
			player.charging = true;
			player.shoot();
			tapToShoot = 0;
		}
	}
	
	// Pausing, currently can't unpause
	if(keydown.shift) {
		if(gameLoop) {
			canvas.font = '48px';
			canvas.fillStyle = "Red";
			canvas.fillText("PAUSED", 100, 100);
			clearInterval(gameLoop);
			gameLoop = 0;
		}
		else startGameLoop();
	}
	
	if (keydown.left  || keydown.a || (tiltMoveX < 0)) {
		player.x -= 5;
		if(keydown.left  || keydown.a)
			player.sprite = player.leftsprite;
		tiltMoveX = 0;
	}
	else player.sprite = player.straightsprite;
	
	if (keydown.right || keydown.d || (tiltMoveX > 0)) {
		player.x += 5;
		if(keydown.right || keydown.d)
			player.sprite = player.rightsprite;
		tiltMoveX = 0;
	}
	else if (!keydown.left && !keydown.a) player.sprite = player.straightsprite;
	
	if (keydown.up || keydown.w || (tiltMoveY < 0)) {
		player.y -= 5;
		tiltMoveY = 0;
	}

	if (keydown.down || keydown.s || (tiltMoveY > 0)) {
		player.y += 5;
		tiltMoveY= 0;
	}
	//***********************
	
	// Keep the player from moving out of bounds
	player.x = player.x.clamp(0, CANVAS_WIDTH - player.width - 20);
	player.y = player.y.clamp(50, CANVAS_HEIGHT - player.height*2);
	
	// Update our location in the background image
	if ((skyy + skydy) < (900-485)){ 
		skyy += skydy; 
	}
	else {
		skyy = 1;
	}
	
	// Move all player bullets
	playerBullets.forEach(function(bullet) {
		bullet.update();
	});

	// Check for finished bullets
	playerBullets = playerBullets.filter(function(bullet) {
		return bullet.active;
	});
	
	// Move enemies
	enemies.forEach(function(enemy) {
		enemy.update();
	});

	// Check for dead enemies
	enemies = enemies.filter(function(enemy) {
		return enemy.active;
	});

	// Check for collisions between player and enemy
	// And for enemies and player bullets
	handleCollisions();

	// Player death, game over
	if(!player.active) {
		canvasElement.get(0).onmouseup = 0;
		player.sprite = player.deathsprite;
		// Reset game after 4 seconds of game over screen
		setTimeout(startGameLoop, 4000);
		
		try {
				// Save the player score to local storage
				oldScore = localStorage.getItem("highScore");
				if(highScore) {
					if(playerScore > highScore) {
						// New high score!
						localStorage.setItem("highScore", playerScore);
						setHighScore(playerScore);
					}
				} 
				else {
					// No previous scores, new high score
					localStorage.setItem("highScore", playerScore);
					setHighScore(playerScore);
				}
			}
			catch (e) {
				// If the local cache is full, throw an error
//				if (e == QUOTA_EXCEEDED_ERR) {
//					alert('Quota exceeded!'); //data wasn't successfully saved due to quota exceed so throw an error
//				}
			}
			
		// Stop the game
		clearInterval(gameLoop);
	}
	
	// Add new enemies based on a random roll
	var enemySeed = Math.random();
	if(enemySeed < 0.05) {
		enemies.push(Enemy());
	}
	if (enemySeed < .005 && playerScore > 50) {
		enemies.push(Enemy(0, 'B'));
	}
	if (enemySeed < .003 && playerScore > 100) {
		enemies.push(Enemy(0, 'C'));
	}
	if (enemySeed > .980 && playerScore> 200) {
		enemies.push(Enemy(0, 'D'));
	}
}

function draw() {
	// Clear the screen
	canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	// Draw our background
	canvas.drawImage(sky, 0, skyy, sky.width, CANVAS_HEIGHT, 0, 0, sky.width, CANVAS_HEIGHT);
	
	// Give everything a nice drop shadow
	canvas.shadowOffsetX = 1;
	canvas.shadowOffsetY = 1;
	canvas.shadowBlur = 10;
	canvas.shadowColor = "#000000";
	
	
	
	playerBullets.forEach(function(bullet) {
		bullet.draw();
	});
	
	player.draw();
	
	enemies.forEach(function(enemy) {
		enemy.draw();
	});
	
	// Draw the player score
	canvas.fillStyle = STYLE.score.color;
	canvas.font = STYLE.score.font;
	canvas.fillText(GAME_MSG.score + playerScore, 25, 40);
	// Game over style 
	canvas.fillStyle = STYLE.gameover.color;
	canvas.font = STYLE.gameover.font;
	// Draw our game over image if the player is dead
	if(!player.active) {
		if(playerScore > oldScore) {
			canvas.fillText( GAME_MSG.newScore + (playerScore || 0), ((CANVAS_WIDTH-gameOverImg.width)/2+60 ), 
										((CANVAS_HEIGHT-gameOverImg.height)/2)-60);
			canvas.fillText( GAME_MSG.highestScore + (oldScore || 0), ((CANVAS_WIDTH-gameOverImg.width)/2+60 ), 
										((CANVAS_HEIGHT-gameOverImg.height)/2)-30);	
		}
		else {
			canvas.fillText( GAME_MSG.historyScore + (oldScore || 0), ((CANVAS_WIDTH-gameOverImg.width)/2+40 ), 
										((CANVAS_HEIGHT-gameOverImg.height)/2-30));
		}
		canvas.drawImage(gameOverImg, ((CANVAS_WIDTH-gameOverImg.width)/2), 
										((CANVAS_HEIGHT-gameOverImg.height)/2));

	}
}



// Attempt to use iOS rotation data to move
if (window.DeviceMotionEvent) {
	window.addEventListener('deviceorientation', deviceOrientationHandler, false);
}

function deviceOrientationHandler(eventData) {
	if(eventData.gamma > 0) {
		tiltMoveX += 5;
	} else if (eventData.gamma < 0) {
		tiltMoveX -= 5;		
	}
	if(eventData.beta > 0) {
		tiltMoveY += 5;
	} else if (eventData.beta < 0) {
		tiltMoveY -= 5;
	}
	eventData.stopPropagation();
}
//Allows touch
var touchX = 0,
	touchY = 0;
window.addEventListener('touchstart', function(event){
	event.preventDefault();
	touchX = event.pageX;
	touchY = event.pageY;
});
window.addEventListener('touchmove', function(event){
	event.preventDefault();
    switch (true) {
		case (touchX < event.pageX):{
		    $(document).trigger({ type: 'keydown', which: 39 });//right
		    $(document).trigger({ type: 'keyup', which: 37 });//left
		    break;
		}
		case (touchX > event.pageX):{
			$(document).trigger({ type: 'keyup', which: 39 });//right
		    $(document).trigger({ type: 'keydown', which: 37 });//left
		    break;
		}
    };
    switch (true) {
		case (touchY > event.pageY):{
			$(document).trigger({ type: 'keydown', which: 38 });//up
		    $(document).trigger({ type: 'keyup', which: 40 });//down
		    break;
		}
		case (touchY < event.pageY):{
			$(document).trigger({ type: 'keyup', which: 38 });//up
		    $(document).trigger({ type: 'keydown', which: 40 });//down
		    break;
		}
    };
    touchX = event.pageX;
	touchY = event.pageY;
});
window.addEventListener('touchend', function(event){
	event.preventDefault();
    $(document).trigger({ type: 'keyup', which: 37 });//left
    $(document).trigger({ type: 'keyup', which: 38 });//up
    $(document).trigger({ type: 'keyup', which: 39 });//right
    $(document).trigger({ type: 'keyup', which: 40 });//down
    touchX = event.pageX;
	touchY = event.pageY;
});
window.addEventListener('touchcancel', function(event){
	event.preventDefault();
    $(document).trigger({ type: 'keyup', which: 37 });//left
    $(document).trigger({ type: 'keyup', which: 38 });//up
    $(document).trigger({ type: 'keyup', which: 39 });//right
    $(document).trigger({ type: 'keyup', which: 40 });//down
    touchX = event.pageX;
	touchY = event.pageY;
});

// Allows firing on iOS devices
canvasElement.get(0).onclick = function(event) { tapToShoot = 1; event.preventDefault();};
canvasElement.get(0).addEventListener('touchstart', function(event){event.preventDefault(); tapToShoot = 1; });

function Bullet(I) {

	I.active = true;
	I.xVelocity = 0;
	I.yVelocity = -I.speed;
	I.width = 15;
	I.height = 15;
	I.sprite = Sprite("playerFireball.png");
	
	I.inBounds = function() {
		return I.x >= 0 && I.x <= CANVAS_WIDTH &&
			I.y >= 0 && I.y <= CANVAS_HEIGHT;
	};

	I.draw = function() {
		if(I.active)
			this.sprite.draw(canvas, this.x, this.y);
	};

	I.update = function() {
		I.x += I.xVelocity;
		I.y += I.yVelocity;

		I.active = I.active && I.inBounds();
	};

	return I;
}

function Enemy(I, type) {
	I = I || {};
	I.type = type;
	I.active = true;
	I.age = Math.floor(Math.random() * 128);

	I.x = CANVAS_WIDTH / 4 + Math.random() * CANVAS_WIDTH / 2;
	I.y = -30;
	I.xVelocity = 0
	I.yVelocity = 2;
	I.isPowerUp = false;
	I.width = 45;
	I.height = 32;
	I.sprite = Sprite("enemy.png");
	I.deathsprite = Sprite("explosion.png");
	
	if((I.type === 'B') || (I.type === 'C') || (I.type === 'D')) {
		var pickSide = Math.random();
		if(pickSide < .5) {
			if(I.type === 'B') {
				// Enemy B Side Plane Heading Left
				I.sprite = Sprite("greenEnemyLeft.png");
				I.x = CANVAS_WIDTH-I.width;
				I.xVelocity = -8;
				I.y = player.y;
				I.yVelocity = 0;
			}
			else if(I.type === 'C') {
				// Enemy C Bomber Heading Left
				I.sprite = Sprite("Wily.png");
				I.x = CANVAS_WIDTH-I.width;
				I.xVelocity = -2;
				I.yVelocity = 0;
				I.y = 5;
			}
			else if(I.type === 'D') {
				// Enemy D Asteroid Heading Left
				I.sprite = Sprite("asteroid.png");
				I.x = CANVAS_WIDTH-20;
				I.y = Math.random() * (CANVAS_HEIGHT-100);
				I.xVelocity = -6;
				I.yVelocity = 3;
				I.width = 50;
				I.height = 50;
			}
		}
		else {
			if(I.type === 'B') {
				// Enemy B Side Plane Heading Right
				I.sprite = Sprite("greenEnemy.png");
				I.x = -10;
				I.xVelocity = 8 + (playerScore / 600);
				I.y = player.y + (Math.random() * 40);
				I.yVelocity = 0;
			}
			else if(I.type === 'C') {
				// Enemy C Bomber Heading Right
				I.sprite = Sprite("Wily.png");
				I.x = -10;
				I.y = 5;
				I.xVelocity = 2;
				I.width = 65;
				I.yVelocity = 0;
			}
			else if(I.type === 'D') {
				// Enemy D Asteroid Heading Left
				I.sprite = Sprite("asteroid.png");
				I.x = -10;
				I.y = Math.random() * (CANVAS_HEIGHT-100);
				I.xVelocity = 6;
				I.yVelocity = 3;
				I.width = 50;
				I.height = 50;
			}
		}
		
	}
	else if (I.type === 'P') {
			// Enemy C's projectiles
			I.xVelocity = 0;
			I.sprite = Sprite("enemyFireball.png");
			I.width = 16;
			I.height = 60;
	}
	else if (I.type === 'S') {
			// Shield power up
			I.width = 20;
			I.height = 20;
			I.sprite = Sprite("shield.png");
			I.deathsprite = I.sprite;
	}
	else if (I.type === 'M') {
			// Multishot power up
			I.width = 20;
			I.height = 20;
			I.sprite = Sprite("laserPowerUp.png");
			I.deathsprite = I.sprite;
	}
	
	I.inBounds = function() {
		return I.x >= -30 && I.x <= CANVAS_WIDTH+10 &&
			I.y >= -30 && I.y <= CANVAS_HEIGHT;
	};

	I.draw = function() {
		this.sprite.draw(canvas, this.x, this.y);
	};

	I.update = function() {
		I.x += I.xVelocity;
		I.y += I.yVelocity;
		
		// A type enemies move back and forth
		if(!this.type)
			I.xVelocity = 3 * Math.sin(I.age * Math.PI / 64);

		I.age++;
		
		// C Type enemies have a chance to drop bombs
		if(this.type === 'C') {
			var fireChance = Math.random();
			if(fireChance < .015) {
				// Drop a bomb towards the player
				var projectile = Enemy(0, 'P');
				projectile.x = this.x;
				projectile.y = this.y + this.height;
				enemies.push(projectile);
			}
		}
		
		I.active = I.active && I.inBounds();
	};

	I.spawnPowerUp = function(type) {
		// Spawn a power up at the location of the enemy that died
		var newPowerUp = Enemy(0, type);
		newPowerUp.x = I.x;
		newPowerUp.y = I.y;
		newPowerUp.isPowerUp = true;
		enemies.push(newPowerUp);
	}
	
	I.explode = function() {
		this.active = false;
		I.sprite = I.deathsprite;
		var powerUpChance = Math.random();
		
		// Add to the player score based on enemy type
		// Each type has a different chance to spawn power ups
		if(!type) {
			// Base A type enemy
			playerScore += 5;
			if(powerUpChance < .02) {
				I.spawnPowerUp('S');
			}
			else if(powerUpChance < .03) {
				I.spawnPowerUp('M');
			}
		}
		else {
			switch(type) {
				// C type bomber enemy
				case 'C': 
					playerScore += 30;
					if(powerUpChance < .06) {
						I.spawnPowerUp('S');
					}
					else if(powerUpChance < .12) {
						I.spawnPowerUp('M');
					}
					break;
				// B type side plane enemy	
				case 'B': 
					playerScore += 20;
					if(powerUpChance < .05) {
						I.spawnPowerUp('S');
					}
					else if(powerUpChance < .11) {
						I.spawnPowerUp('M');
					}
					break;
				// D type asteroid enemy	
				case 'D': 
					playerScore += 30;
					if(powerUpChance < .05) {
						I.spawnPowerUp('S');
					}
					else if(powerUpChance < .11) {
						I.spawnPowerUp('M');
					}
					break;

				case 'M':
				case 'S':
					// This was a power up, add it to the player
					player.addPowerUp(type);
					break;
			}
		}
	};
	
	
	return I;
}; 

function collides(a, b) {
	return a.x < b.x + b.width &&
			a.x + a.width > b.x &&
			a.y < b.y + b.height &&
			a.y + a.height > b.y;
}

function handleCollisions() {
	// Check player bullets and enemy collision
	playerBullets.forEach(function(bullet) {
		enemies.forEach(function(enemy) {
			// Don't check for powerups, they can't be destroyed
			if(!enemy.isPowerUp) {
				if (collides(bullet, enemy)) {
					enemy.explode();
					bullet.active = false;
				}
			}
		});
	});

	// Check enemy and player ship collision
	enemies.forEach(function(enemy) {
		if (collides(enemy, player)) {
			enemy.explode();
			if(!enemy.isPowerUp) {
				if(!player.shielded) {
					player.explode();
				}
				else {
					player.shielded = false;
				}
			}
		}
	});
}
