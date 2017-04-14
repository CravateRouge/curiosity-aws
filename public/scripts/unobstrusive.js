/*global THREE*/
var length;
var actualLayer;
var layerLength;
var actuLayerLength;
var coinsValue = 0;
var color;
var shake = 0;
var clicks = 0;
var clickOK = false;
var auto;
var bIPrice = 10;
var aCPrice = 10;
var exPrice = 10;

window.onload = function() {

	var ws = new WebSocket('wss://' + window.location.hostname + window.location.pathname + window.location.search);
	var board = document.querySelector('#board');
	var cubeContainer = document.querySelector('#cube-container');
	var exclu = document.querySelector('#exclu');
	var patt = /\d+/;
	exPrice = patt.exec(exclu.textContent)[0];
	var autoClick = document.querySelector('#autoClick');
	aCPrice = patt.exec(autoClick.textContent)[0];
	var big = document.querySelector('#big');
	bIPrice = patt.exec(big.textContent)[0];

	/*Init 3D*/
	var scene = new THREE.Scene();

	//Add some lights

	for (var i = 0; i < 6; i++) {
		var pos = [0, 0, 0];
		var light = new THREE.PointLight(0xffffff, 1.5);
		pos[i % 3] = (3 - i) == 0 ? -60 : 60 * (3 - i) / Math.abs(3 - i);
		light.position.set(pos[0], pos[1], pos[2]);
		scene.add(light);
	}

	// var light = new THREE.PointLight(0xffffff, 1.5);
	// light.position.set(Infinity, 0, 0);
	// scene.add(light);

	var camera = new THREE.PerspectiveCamera(75, cubeContainer.offsetWidth / cubeContainer.offsetHeight, 0.1, 1000);
	camera.position.z = 100;
	var renderer = new THREE.WebGLRenderer({
		alpha: true,
		canvas: cubeContainer
	});
	renderer.setSize(cubeContainer.offsetWidth, cubeContainer.offsetHeight);
	//The cube is empty until the server sends data
	var cube = undefined;

	//Used to know the tile touched
	var mouse = new THREE.Vector2();
	var raycaster = new THREE.Raycaster();

	//Used to enable zoom and click
	var controls = new THREE.OrbitControls(camera, renderer.domElement);
	//Disable shifting
	controls.enablePan = false;

	controls.addEventListener('change', render);
	cubeContainer.addEventListener('click', clickUpdate, false);

	//Bonus Eventlistener
	exclu.addEventListener('click', () => {
		sendBonus(exPrice, 'exclu')
	});
	autoClick.addEventListener('click', () => {
		sendBonus(aCPrice, 'autoClick')
	});
	big.addEventListener('click', () => {
		sendBonus(bIPrice, 'big')
	});

	//Render the scene
	function render() {
		renderer.render(scene, camera);
	}

	function sendBonus(price, idBonus) {
		if (coinsValue >= price) {
			ws.send(JSON.stringify({
				id: idBonus,
				type: 'bonus'
			}));
			printCoins(-price);
		}
	}

	//Updating server's information
	function clickUpdate(event) {
		event.preventDefault();

		//Take click's coordinates and check if a tile is touched
		mouse.x = (event.offsetX / cubeContainer.offsetWidth) * 2 - 1;
		mouse.y = -(event.offsetY / cubeContainer.offsetHeight) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		var intersects = raycaster.intersectObject(cube);
		//If a tile is touched send information to the server
		if (intersects.length > 0) {
			var position = intersects[0].faceIndex;
			position = Math.floor(position / 2);

			//Send the tile's id to the server
			if (shake > 0) {
				for (var i = -1; i < 1; i++) {
					ws.send(JSON.stringify({
						id: position + i - length,
						type: 'click'
					}));

					ws.send(JSON.stringify({
						id: position + i,
						type: 'click'
					}));

					ws.send(JSON.stringify({
						id: position + i + length,
						type: 'click'
					}));
				}
				shake -= 1;
			}
			else
				ws.send(JSON.stringify({
					id: position,
					type: 'click'
				}));
		}
	}



	function initValues(newLength, level, surface, actuSurface, newCoinValue) {
		actualLayer = level;
		length = newLength;
		layerLength = surface;
		actuLayerLength = actuSurface;
		printCoins(newCoinValue);
	}

	function towerRenderer(towerTiles) {
		//Add the coins counter and the cube

		color = layerColor(actualLayer);
		var geometry = new THREE.BoxGeometry(50, 50, 50, length, length, length);

		var material = new THREE.MeshLambertMaterial();
		material.vertexColors = THREE.FaceColors;

		var futureColor = layerColor(actualLayer - 1);
		for (var id in towerTiles) {
			var colorbuff = color;
			if (towerTiles[id] != actualLayer) {
				colorbuff = futureColor;
			}
			geometry.faces[id * 2].color.setHex(colorbuff);
			geometry.faces[id * 2 + 1].color.setHex(colorbuff);
		}
		color = futureColor;

		cube = new THREE.Mesh(geometry, material);
		cube.rotation.y += 5;
		scene.add(cube);

		render();

	}


	function tileColor(tile) {
		cube.geometry.faces[tile * 2].color.setHex(color);
		cube.geometry.faces[tile * 2 + 1].color.setHex(color);
		cube.geometry.elementsNeedUpdate = true;
		render();
	}

	//Set a hexadecimal color corresponding to a layer
	function layerColor(layer) {
		var h = layer * 5537977 % 347;
		var s = layer * 614327 % 60 + 40;
		var l = layer == 0 ? 100 : layer * 643086 % 30 + 30;

		return new THREE.Color('hsl(' + h + ', ' + s + '%, ' + l + '%)').getHex();
	}

	function destruction(id) {
		tileColor(id);

		actuLayerLength--;
		if (actuLayerLength == 0) {
			actuLayerLength = layerLength;
			actualLayer--;
			color = layerColor(actualLayer - 1);
		}
	}

	function printCoins(value) {
		coinsValue += value;
		var coins = document.getElementById('coins');
		coins.innerHTML = "";
		coins.appendChild(document.createTextNode(coinsValue));
	}

	function printWinner(winner) {
		board.innerHTML = "";
		var h1 = document.createElement('h1');
		h1.className = "text-center lead text-primary";
		h1.appendChild(document.createTextNode(winner + ' wins!!'));
		board.appendChild(h1);
	}

	function printReward() {
		board.innerHTML = "";

		var div = document.createElement('div');
		div.setAttribute('class', 'embed-responsive embed-responsive-16by9');

		var iframe = div.appendChild(document.createElement('iframe'));
		iframe.setAttribute('class', 'embed-responsive-item');
		iframe.setAttribute('height', '315');
		iframe.setAttribute('src', 'https://www.youtube.com/embed/TAryFIuRxmQ?rel=0&controls=0&showinfo=0&amp;autoplay=1');
		iframe.setAttribute('frameborder', '0');

		board.appendChild(div);
	}

	function bigOK() {
		shake = 15;
	}

	function autoClickOK() {
		clickOK = true;
		clicks = 20;
	}

	function clicking() {
		if (clickOK) {
			var rnum = Math.floor(Math.random() * (layerLength + 1));
			ws.send(JSON.stringify({
				id: rnum,
				type: 'click'
			}));
			clicks--;
			if (clicks <= 0) {
				clickOK = false;
				clearInterval(auto);
			}
		}
		else clearInterval(auto);
	}

	ws.addEventListener('open', function(e) {

		ws.addEventListener('message', function(e) {
			var data = JSON.parse(e.data);

			switch (data.type) {
				case 'initialization':
					initValues(data.side, data.level, data.surface, data.actuSurface, data.coinsValue);
					towerRenderer(data.towerTiles);
					break;

				case 'destruction':
					destruction(data.id);
					break;

				case 'coin':
					printCoins(data.value);
					break;

				case 'defeat':
					printWinner(data.winner);
					break;

				case 'win':
					printReward();
					break;

				case 'big':
					bigOK();
					break;

				case 'autoClick':
					autoClickOK();
					auto = setInterval(clicking, 2000);
					break;

				default:
					console.log('An unknown message has been sent: ' + data);
			}
		});
	});

};
