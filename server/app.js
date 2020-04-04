'use strict';

const Express = require("express");
const App = Express();
const Http = require("http").Server(App);
const IO = require("socket.io")(Http);
const Deck = require("card-deck");
const Crypto = require('crypto');

const Session = require("express-session")({
    secret: "my-secret-möö",
    // store: new SessionStore({ path: './tmp/sessions' }),
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1*60*60*1000, // 1 hour
        secure: true
    }
});

// const Sharedsession = require("express-socket.io-session");
 
// Use express-session middleware for express
App.use(Session);

const MinPlayers = 1; // TODO should be 4

class Player {
    constructor(id, name){
        this.id = id;
        this.name = name;
        this.rank = null; // TODO
    }
}

class Client {
    constructor(token, player) {
        this.token = token,
        this.player = player
    }
}

class Clients {
    constructor(clients) {
        this.clients = clients;
    }

    addClient(client) {
        var serverClient = this.clients.find(c => c.player.name === client.player.name);
        if(serverClient){
            console.log('Updating client info for player: ' + client.player.name);
            console.log('- Token before: ' + this.clients[client.player.name].token);
            serverClient = client;
            console.log('- Token after: ' + this.clients[client.player.name].token);
        }
        else{
            console.log('Adding client for new player: ' + client.player.name);
            this.clients.push(client);
        }
    }

    getClient(token) {
        const client = this.clients.find(c => c.token === token);
        if(client){
            return client;
        }
        console.error('No client found for token: ' + token);
        return null;
    }

    removeClient(token) {
        const index = this.clients.findIndex(c => c.token === token);
        if(index > -1){
            const serverClient = this.clients[index];
            console.log('Removing client for player: ' + serverClient.player.name);
            this.clients.splice(index, 1);
        }
        else{
            console.error('No client found for token: ' + token);
        }
    }
}

class Game {
    constructor(players, state){
        this.players = players;
        this.state = state;
        this.deck = InitDeck();
        this.turnIndex = 0;
    }

    addPlayer(player){
        // Prevent same sesison joining multiple times
        if(game.players.find(x => x.id === player.id)){
            console.log("Player already joined in this game!")
            return;
        }

        console.log("new player");
        console.log("- name: " + player.name)
        console.log("- id: " + player.id);

        if(player.rank == null){
            player.rank = this.players.length + 1
        }

        console.log("- rank: " + player.rank);

        this.players.push(player);
    }

    deal(){
        let deckSize = this.deck.remaining();
        console.log("Deck size: " + deckSize);
        let minSizeOfHand = Math.floor(deckSize / this.players.length);
        console.log("Min size of hand: " + minSizeOfHand);
        let amountOfExtraCards = deckSize - minSizeOfHand * this.players.length;
        console.log("Extra cards: " + amountOfExtraCards);
        console.log("Amount of players: " + this.players.length);

        this.players.forEach(player => {
            let drawAmount = minSizeOfHand;
            
            if(amountOfExtraCards > 0){
                ++drawAmount;
            }

            console.log("Drawing " + drawAmount)
            player.hand = this.deck.draw(drawAmount);
            player.hand.sort((a,b) => a.number - b.number);
            console.log("Hand has " + player.hand.length)
        });
    }

    start(){
        if(this.state != "init"){
            console.error("Can not start game that is not in init state!");
            return;
        }

        if(this.players.length >= MinPlayers){
            console.log("Starting the game...")
            this.state = "started";
            // Sort by rank
            this.players.sort((a,b) => a.rank - b.rank);

            this.deal();
        }
        else{
            console.warn("Not enough players to start the game!")
        }
    }

    pass(){
        ++this.turnIndex;
        if(this.turnIndex >= this.players.length){
            this.turnIndex = 0;
        }

        // TODO check if round is over
    }
}

let game = new Game([], "init");

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

IO.use(function(client, next) {
    Session(client.handshake, {}, next);
});

// List of connected clients
let clients = new Clients([]);

IO.on("connection", client => {
    console.log(client.id);
    console.log(client.handshake.session.id)

    // addClient(client.handshake.session);

    client.emit('sessiondata', client.handshake.session);

    // Set session data via socket
    console.debug('Emitting session data');
    client.on('login', data => {
        console.debug('Received login message');

        // TODO real login :D
        if(data.password !== data.username + '22'){
            console.warn("Invalid password!")
            client.emit('logged_out')
            return;
        }

        let token = Crypto.randomBytes(48).toString('hex');

        client.handshake.session.user = {
            username: data.username,
            token: token
        };
        console.debug('client.handshake session data is %j.', client.handshake.session);

        client.handshake.session.save();

        var player = new Player('id-will-be-deprecated', data.username);

        clients.addClient(new Client(client.handshake.session.user.token, player));
        //emit logged_in for debugging purposes of this example
        client.emit('logged_in', client.handshake.session);
    });
    // Check session data via socket
    client.on('checksession', session_token => {
        console.debug('Received checksession message');
        console.log(client.handshake.session.id)
        console.debug('client.handshake session data is %j.', client.handshake.session);

        const session = clients.getClient(session_token);

        if(session){
            client.handshake.session.user = {
                username: session.player.name,
                token: session.token
            };
        }

        client.emit('checksession', client.handshake.session);
    });
    // Unset session data via socket
    client.on('logout', session_token => {
        console.debug('Received logout message');
        delete client.handshake.session.user;
        client.handshake.session.save();

        clients.removeClient(session_token);
        //emit logged_out for debugging purposes of this example
        console.debug('client.handshake session data is %j.', client.handshake.session);

        client.emit('logged_out', client.handshake.session);
    });

    client.emit("game", game);
    client.on("join", data => {
        let playerSocketId = client.id;
        let playerName = data;
        let newPlayer = new Player(playerSocketId, playerName);
        game.addPlayer(newPlayer);
        console.log("Players: " + game.players.length)
        IO.emit("game", game);
    });

    client.on("start", data => {
        game.start();

        IO.emit("game", game);
    });

    client.on("pass", data => {
        console.log("Pass")
        game.pass();

        IO.emit("game", game);
    });
});

function addClient(client){
    if(clients[client.player.name]){
        client = clients[session.id];
    }
    else{
        clients[session.id] = session;
    }
}

// TODO: Maybe construct some classes for these...
function InitDeck(){
    console.log("Initializing the deck")
    const cards = [...Array(1).fill({number: 1, name: "One"}),
        ...Array(2).fill({number: 2, name: "Two"}),
        ...Array(3).fill({number: 3, name: "Three"}),
        ...Array(4).fill({number: 4, name: "Four"}),
        ...Array(5).fill({number: 5, name: "Five"}),
        ...Array(6).fill({number: 6, name: "Six"}),
        ...Array(7).fill({number: 7, name: "Seven"}),
        ...Array(8).fill({number: 8, name: "Eight"}),
        ...Array(9).fill({number: 9, name: "Nine"}),
        ...Array(10).fill({number: 10, name: "Ten"}),
        ...Array(11).fill({number: 11, name: "Eleven"}),
        ...Array(12).fill({number: 12, name: "Twelve"}),
        ...Array(2).fill({number: 13, name: "Joker"}),
    ]

    console.log(cards.length);
    var deck = new Deck(cards);
    deck.shuffle();

    return deck;
}