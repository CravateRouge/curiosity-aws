var length;
var actualLayer;
var layerLength;
var actuLayerLength;
var board = document.querySelector('#board');

var ws = new WebSocket('wss://' + window.location.host)

function initValues(newLength, level, surface, actuSurface) {
    actualLayer = level;
    length = newLength;
    layerLength = surface;
    actuLayerLength = actuSurface;
}

function towerRenderer(towerTiles) {
    //Clean the board and add the table
    board.innerHTML = "";

    var table = board.appendChild(document.createElement('table'));

    //Initialize the tiles
    var i = 0;
    var tileLine = table.appendChild(document.createElement('tr'));
    for (var id in towerTiles) {
        if (i == length) {
            tileLine = table.appendChild(document.createElement('tr'));
            i = 0;
        }

        var tile = tileLine.appendChild(document.createElement('td'));
        tile.id = id;
        tileColor(tile, towerTiles[id]);
        tile.addEventListener('click', clickUpdate); //Trigger an event with a column's click
        i++;
    }

}

function clickUpdate(event) {
    var tile = event.target;
    //Send the tile's id to the server
    ws.send(JSON.stringify({
        id: tile.id
    }));
}

function tileColor(tile, layer) {
    var rgbValue = 255 - ((layer * 123) % 255);
    tile.style.backgroundColor = "rgb(" + (255 - rgbValue * 33 % 255) + " ," + (255 - rgbValue * 76 % 255) + " ," + (255 - rgbValue * 59 % 255) + ")";
}

function destruction(id) {
    var tile = document.getElementById(id);
    tileColor(tile, actualLayer - 1);
    actuLayerLength--;

    if (actuLayerLength == 0) {
        actuLayerLength = layerLength;
        actualLayer--;
    }
}

ws.addEventListener('open', function(e) {

    ws.addEventListener('message', function(e) {
        var data = JSON.parse(e.data);
        
        switch (data.type) {
            case 'initialization':
                initValues(data.side, data.level, data.surface, data.actuSurface);
                towerRenderer(data.towerTiles);
                break;
                
            case 'destruction':
                destruction(data.id);
        }
    });
});