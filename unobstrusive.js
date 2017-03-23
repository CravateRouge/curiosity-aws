var length = 2;
var level = 5;
var actualLayer = level;
var layerLength = length*length;
var actuLayerLength = layerLength;
var board = document.querySelector('#board');

function tileColor(tile,layer){
    var rgbValue = 255-((layer*123)%255);
    tile.style.backgroundColor = "rgb("+(255-rgbValue*33%255)+" ,"+(255-rgbValue*76%255)+" ,"+(255-rgbValue*59%255)+")";
}

function destruction(event) {
    var tile = event.target;
    
    if(tile.className.charAt(tile.className.length-1) == actualLayer){//Decrement the current layer of the tile if it's at the same level as the actual layer.
        tile.className="level_"+(actualLayer-1);
        tileColor(tile,actualLayer-1);
        actuLayerLength--;//The actual layer loose a tile.
        
        if(actuLayerLength == 0){//When the layer no longer has tile it's going to the below layer.
            actuLayerLength = layerLength;
            actualLayer--;
            
            if(actualLayer == 0){//When there is no more layer the player wins and the kernel is shown.
                board.innerHTML = "";
                board.appendChild(document.createTextNode("Ceci est le noyau, tu as gagné, bravo."));
            }
        }
    }
    
}

//Clean the board and add the table
board.innerHTML = "";

var table = board.appendChild(document.createElement('table'));

//Initialize the tiles
var tiles = [];
for (var i = 0; i < length; i++) {
    tiles[i] = [];
    var tileLine = table.appendChild(document.createElement('tr'));

    for (var j = 0; j < length; j++) {
        var tile = tiles[i][j];
        tile = tileLine.appendChild(document.createElement('td'));
        tile.className = "level_"+level;
        tileColor(tile,level);
        tile.addEventListener('click', destruction); //Trigger an event with a column's click
    }
}
