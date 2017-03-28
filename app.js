var express = require('express');
var session = require('express-session');
var ws = require('ws');
var http = require('http');
var tower = require('tower');

var app = express();
//A game instance
var towerInstance = new tower.Tower(2,5);

var sess_storage = session({
    secret: "12345",
    resave: false,
    saveUninitialized: false,
});

//JSON formatted initialization parameters 
function iniParams(){
   return JSON.stringify({
        type : 'initialization',
        towerTiles: towerInstance.towerTiles,
        level: towerInstance.actualLayer,
        side: towerInstance.lengthSide,
        surface : towerInstance.layerLength,
        actuSurface : towerInstance.actuLayerLength
    });
}

app.use(sess_storage);

//Set static routes to serve styles and scripts
app.use(express.static(__dirname));
app.use("/styles", express.static(__dirname));
app.use("/scripts", express.static(__dirname));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/curiosity.html');
});


var server = http.createServer(app);
var wsserver = new ws.Server({
    server: server,
    // Ceci permet d'importer la session dans le serveur WS, qui
    // la mettra à disposition dans wsconn.upgradeReq.session, voir
    // https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js
    verifyClient: function(info, next) {
        sess_storage(info.req, {}, function(err) {
            if (err) {
                next(false, 500, "Error: " + err);
            }
            else {
                // Passer false pour refuser la connexion WS
                next(true);
            }
        });
    },
});

wsserver.on('connection', function(wsconn) {
    //Send initialization parameters at the establishment of a new connection
    wsconn.send(iniParams());
    
    //Trigger a treatment when a tile is clicked
    wsconn.on('message', function(data) {
        data = JSON.parse(data);
        var change = towerInstance.decrement(data.id);
        if (change) {
            //If someone wins, reload a new game
            if (change == 'WIN') {
                towerInstance = new tower.Tower(3,5);
                wsconn.send(iniParams());
            }
            //If a tile is destroyed the update is sent to players
            else {
                wsconn.send(JSON.stringify({
                   type : 'destruction',
                   id : data.id
                }));
            }
        }
    });
    // ...
});

server.listen(process.env.PORT);
