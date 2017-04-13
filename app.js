var express = require('express'),
    session = require('express-session'),
    bodyP = require('body-parser'),
    ws = require('ws'),
    http = require('http'),
    tower = require('tower'),
    mongoose = require('mongoose'),
    User = require('user-model'),
    twig = require('twig'),
    cookieP = require('cookie-parser');

var app = express();

//twig
app.set('views', 'templates');
app.set("twig options", {
    autoescape: true
});


//Game instances
var towerInstances = {};

var sess_storage = session({
    secret: "|<|_|.-|05|+`/ \\/\\/}{4+'2 ||\\| +3}{ 94|\\/|3?",
    resave: false,
    saveUninitialized: false,
});

//Initiate the connection to the database
var connStr = 'mongodb://localhost/data';
mongoose.connect(connStr, function(err) {
    if (err) throw err;
    console.log('Successfully connected to MongoDB');
});


app.use(sess_storage)
    .use(cookieP())
    .use(bodyP.urlencoded({
        extended: false
    }));


//Set static routes to serve styles and scripts
app.use(express.static(__dirname + '/public'));

//Main page route
app.all('/', function(req, res) {
    if (req.method == 'POST')
        res.redirect('/' + req.body['redirect']);
    else
        res.render('index.twig');

});


//Signup page route
app.all('/signup', function(req, res) {
    if (req.method == 'POST') {
        var login = req.body.login,
            pass = req.body.pass;

        if (login && pass) {
            //Create the document for the current user
            new User({
                _id: login,
                password: pass
            }).save(function(err) { //Save it in the database
                if (err) {
                    if (err.code == 11000) //If the username is already stored in the db
                    {
                        res.render('signup.twig', {
                            'error': 'Username already exists'
                        });
                    }

                    else {
                        console.log(err);
                        res.status(500).send('NoSQL Error');
                    }
                }

                else
                    res.redirect('/signin');
            });
        }
        else {
            res.render('signup.twig', {
                'error': 'You must fill all fields'
            });
        }

    }
    else
        res.render('signup.twig');
});



//Connection page route
app.all('/signin', function(req, res) {
    if (req.method == 'POST') {
        var login = req.body.login,
            pass = req.body.pass;

        if (login && pass) {
            User.findOne({
                _id: login
            }, function(err, user) {
                if (err) {
                    console.log(err);
                    res.status(500).send('NoSQL Error');
                }
                else if (user) {
                    user.comparePassword(pass, function(err, isMatch) {
                        if (err) {
                            console.log(err);
                            res.status(500).send('NoSQL Error');
                        }
                        else if (isMatch) {
                            req.session.login = user._id;
                            res.redirect('/lobby');
                        }
                        else
                            res.render('signin.twig', {
                                'error': 'Wrong username or password'
                            });
                    });
                }
                else {
                    res.render('signin.twig', {
                        'error': 'Wrong username or password'
                    });
                }
            });
        }
        else
            res.render('signin.twig', {
                'error': 'You must fill all fields'
            });
    }
    else
        res.render('signin.twig');
});


//Game page route (Connection needed)
app.all('/game', function(req, res) {
    if (req.method == 'POST') {
        res.redirect('/' + req.body['redirect']);
        return;
    }

    var gameName = req.query['room'];
    var valRoom = /^(\w|\d){10}$/.test(gameName);
    var valLayer = req.query['layer'] > 0;
    var valLength = req.query['length'] > 0 && req.query['length'] < 56;

    if (!valRoom || !valLayer || !valLength)
        res.redirect('/logout');

    //Create a new game instance if specific room doesnt exist
    else if (!towerInstances[gameName]) {
        towerInstances[gameName] = new tower.Tower(req.query['length'], req.query['layer']);
        res.render('curiosity.twig');
    }

    else if (towerInstances[gameName].layer != req.query['layer'] ||
        towerInstances[gameName].lengthSide != req.query['length'])
        res.redirect('/logout');

    else
        res.render('curiosity.twig');
});

//Room selection page route (Connection needed)
app.all('/lobby', function(req, res) {
    if (!req.session) res.redirect('/');

    else if (req.method == 'GET') res.render('lobby.twig');

    else if (req.method == 'POST') res.redirect('/' + req.body['redirect']);
});


//Score page route (Connection needed)
app.all('/score', function(req, res) {
    if (!req.session) res.redirect('/');

    else if (req.method == 'GET') res.render('scoreBoard.twig');

    else if (req.method == "POST") res.redirect('/' + req.body['redirect']);
});


//Deconnection page route
app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});


//Websocket
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

setInterval(function() {
        User.find({
            connected: true
        }, '_id score', {
            sort: {
                score: -1 //Sort by DESC
            }
        }, function(err, docs) {
            if (err) throw err;

            wsserver.clients.forEach(function(client) {
                if (client.readyState != ws.OPEN)
                    return;

                switch (client.upgradeReq.url) {
                    case '/score':
                        client.send(JSON.stringify({
                            'type': 'score',
                            'docs': docs
                        }));
                        break;

                    case '/lobby':
                        client.send(JSON.stringify({
                            'type': 'lobby',
                            'towerInstances': towerInstances
                        }));
                        break;
                }
            });
        });
    },
    30000);


wsserver.on('connection', function(wsconn) {
    //Import session from websocket to server
    var login = wsconn.upgradeReq.session.login;

    //Check if the connection is authentified
    if (!login)
        return;

    User.update({
        _id: login
    }, {
        $set: {
            connected: true
        }
    }).exec();

    //Import url and query from specific the specific websocket
    //this helps to know on which page the user is/in which game room the user is
    var userUrl = wsconn.upgradeReq.url;


    if (userUrl == "/score")
        User.find({
            connected: true
        }, '_id score', {
            sort: {
                score: -1 //Sort by DESC
            }
        }, function(err, docs) {
            if (err) throw err;
            wsconn.send(JSON.stringify({
                'type': 'score',
                'docs': docs
            }));
        });

    if (userUrl == "/lobby")
        wsconn.send(JSON.stringify({
            'type': 'lobby',
            'towerInstances': towerInstances
        }));

    //Case where user is at the game page
    if (userUrl.indexOf('game') > -1) {
        var gameName = /room=((\w|\d){10})/.exec(userUrl)[1];
        //Send initialization parameters at the establishment of a new connection
        User.findOne({
            _id: login
        }, 'coins', function(err, user) {
            if (err) throw err;
            wsconn.send(JSON.stringify({
                type: 'initialization',
                towerTiles: towerInstances[gameName].towerTiles,
                level: towerInstances[gameName].actualLayer,
                side: towerInstances[gameName].lengthSide,
                surface: towerInstances[gameName].layerLength,
                actuSurface: towerInstances[gameName].actuLayerLength,
                coinsValue: user.coins
            }));
        });
    }


    //Trigger a treatment when a tile is clicked
    wsconn.on('message', function(data) {
        data = JSON.parse(data);
        if (data.type == 'click') {
            var change = towerInstances[gameName].decrement(data.id);
            if (change) {
                // Broadcast to everybody
                wsserver.clients.forEach(function each(client) {
                    if (client.readyState === ws.OPEN && client.upgradeReq.url == userUrl) {
                        //If someone wins, print the winner
                        if (change == 'WIN') {
                            if (client.upgradeReq.session.login !== login)
                                client.send(JSON.stringify({
                                    type: 'defeat',
                                    winner: login
                                }));
                            else
                                client.send(JSON.stringify({
                                    type: 'win'
                                }));

                            client.close();
                        }
                        //If a tile is destroyed the update is sent to players
                        else {
                            client.send(JSON.stringify({
                                type: 'destruction',
                                id: data.id
                            }));
                        }
                    }

                });

                if (change == 'WIN')
                    delete towerInstances[gameName];

                else
                //Send coin to the clicker
                    wsconn.send(JSON.stringify({
                    type: 'coin',
                    value: 1
                }));

                //Increment clickers points and score by 1
                User.update({
                    _id: login
                }, {
                    $inc: {
                        score: 1,
                        coins: 1
                    }
                }).exec();
            }
        }
        else if (data.type == 'bonus') {
            switch (data.id) {
                case 'exclu':
                    break;
                case 'autoClick':
                    User.findOne({
                        _id: login
                    }, function(err, user) {
                        if (err) throw err;
                        if (user.coins >= 10) {
                            User.update({
                                _id: user._id
                            }, {
                                $inc: {
                                    coins: -10
                                }
                            });
                            wsconn.send(JSON.stringify({
                                type: 'autoClick',
                                value: true
                            }));
                        }
                        else
                            wsconn.send(JSON.stringify({
                                type: 'autoClick',
                                value: false
                            }));
                    });
                    break;
                case 'big':
                    User.findOne({
                        _id: login
                    }, function(err, user) {
                        if (err) throw err;
                        if (user.coins >= 10) {
                            User.update({
                                _id: user._id
                            }, {
                                $inc: {
                                    coins: -10
                                }
                            });
                            wsconn.send(JSON.stringify({
                                type: 'big',
                                value: true
                            }));
                        }
                        else
                            wsconn.send(JSON.stringify({
                                type: 'big',
                                value: false
                            }));
                    });
                    break;

                default:
                    console.log('An unknown message has been sent: ' + data);
            }
        }
    });

    wsconn.on('close', function() {
        User.update({
            _id: login
        }, {
            $set: {
                connected: false
            }
        }).exec();
    });
});

server.listen(process.env.PORT);
