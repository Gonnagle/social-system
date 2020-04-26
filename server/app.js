'use strict';

const Express = require("express");
const App = Express();
const Http = require("http").Server(App);
const IO = require("socket.io")(Http);
const Deck = require("card-deck");
const Crypto = require('crypto');

const MinPlayers = 1; // TODO should be 4


class Player {
    constructor(name){
        this.name = name;
        this.rank = null; // TODO
    }
}

class Client {
    constructor(token, username) {
        this.token = token,
        this.username = username
    }
}

class Clients {
    constructor() {
        this.clients = [];
    }

    addClient(client) {
        let serverClient = this.clients.find(c => c.username === client.username);
        if(serverClient){
            console.log('Updating client info for player: ' + client.username);
            console.log('- Token before: ' + serverClient.token);
            serverClient = client;
            console.log('- Token after: ' + serverClient.token);
        }
        else{
            console.log('Adding client for new player: ' + client.username);
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

    getClientName(token) {
        if(this.getClient(token)) {
            return this.getClient(token).username;
        }
        return null;
    }

    removeClient(token) {
        const index = this.clients.findIndex(c => c.token === token);
        if(index > -1){
            const serverClient = this.clients[index];
            console.log('Removing client for player: ' + serverClient.username);
            this.clients.splice(index, 1);
        }
        else{
            console.error('No client found for token: ' + token);
        }
    }
}

class PlayAction {
    constructor(cards, player) {
        // TODO validate that valid set of cards?
        this.cards = cards;
        this.player = player;
    }

    getEffectiveNumber() {
        var effectiveNumber = Math.min.apply(Math, this.cards.map(c => c.number));
        console.log('Getting effective number for play being ' + effectiveNumber); 
        return effectiveNumber;
    }
}

class Round {
    constructor() {
        this.plays = [];
        this.amountOfCardsToPlay = -1;
        this.lastNumberPlayed = 999;;
        this.lastPlayer = null;
    }

    play(playAction){
        if(this.plays.length > 0){
            console.log('Not first play in round -> validating the play');
            
            if(playAction.cards.length !== this.amountOfCardsToPlay){
                console.error('Cards to play on round: ' + this.amountOfCardsToPlay + ' received play with ' + playAction.cards.length + ' cards!');
                throw new Error('Invalid amount of cards played!');
            }
            if(playAction.getEffectiveNumber() >= this.lastNumberPlayed){
                console.error('Last number played on round: ' + this.lastNumberPlayed + ' received play with number' + playAction.getEffectiveNumber());
                throw new Error('Too big number played!');
            }
        }

        this.plays.push(playAction);
        this.lastNumberPlayed = playAction.getEffectiveNumber();
        this.setLastPlayer(playAction.player);

        // On first action set also the amount of cards to play on this round
        if(this.amountOfCardsToPlay === -1){
            console.log('Setting round amountOfCardsToPlay to ' + playAction.cards.length);
            this.amountOfCardsToPlay = playAction.cards.length;
        }
    }

    setLastPlayer(player){
        this.lastPlayer = player;
    }

    getLastPlayer(){
        return this.lastPlayer;
    }
}

class Game {
    constructor(players, state){
        this.players = players;
        this.finishedPlayers = [];
        this.hands = {};
        this.state = state;
        this.deck = this.initDeck();
        this.turnIndex = 0;
        this.rounds = [];
    }

    addPlayer(player){
        // Prevent same sesison joining multiple times
        if(this.players.find(x => x.name === player.name)){
            console.log("Player already joined in this game!")
            return;
        }

        console.log("new player");
        console.log("- name: " + player.name)

        // TODO actual ranks
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

            let hand = this.deck.draw(drawAmount);
            hand.sort((a,b) => a.number - b.number);
            this.hands[player.name] = hand;
            console.log("Hand has " + hand.length)
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

            let firstRound = new Round();
            this.rounds.push(firstRound);
        }
        else{
            console.warn("Not enough players to start the game!")
        }
    }

    pass(){
        this.passTurnToNextPlayer();

        let currentRound = this.getCurrentRound();

        if(currentRound.getLastPlayer() === this.getCurrentPlayer().name){
            console.log('Player ' + this.getCurrentPlayer().name + " won the round! Starting new round...");
            let newRound = new Round();
            this.rounds.push(newRound);
        }
    }

    removeCurrentPlayerAsFinished(){
        let player = this.players.splice(this.turnIndex, 1)[0];

        this.finishedPlayers.push(player); // TODO updating ranks?

        // Only one player left -> game finished
        if(this.players.length === 1){
            console.log('Game finished!');

            // Add last player to finished players also
            let lastPlayer = this.players.splice(this.turnIndex, 1)[0];
            this.finishedPlayers.push(lastPlayer);

            this.state = 'finished';
        }
        else {
            // Move turn to the next player
            this.passTurnToNextPlayer();
            // Hack to artificially set the last player to next player (so even if next player 
            // does not play he is counted as starter and we don't run into issues as the actual last player is no longer in game)
            this.getCurrentRound().setLastPlayer(this.getCurrentPlayer());
        }
    }

    passTurnToNextPlayer(){
        console.log('Passing turn to the next player')
        ++this.turnIndex;
        if(this.turnIndex >= this.players.length){
            this.turnIndex = 0;
        }
    }

    play(playAction){
        let playerInTurn = this.getCurrentPlayer();

        if(playerInTurn.name !== playAction.player){
            console.error('SECURITY ERROR - PLAY ACTION RECEIVED FOR PLAYER NOT IN TURN!');
            return;
        }

        this.getCurrentRound().play(playAction);
        let playersHand = this.hands[playAction.player];
        console.log('Last number played on this round updated to: ' + this.getCurrentRound().lastNumberPlayed)

        // Remove all played cards one by one
        playAction.cards.forEach(playedCard => {
            console.log('Removing card from hand: ' + playedCard.number);
            playersHand.splice(playersHand.findIndex(c => c.number === playedCard.number), 1);
        })

        // let playersIndex = ;

        // Check if player is out of the game
        if(playersHand.length === 0){
            console.log('Player ' + playAction.player + ' is out of the game!');
            this.removeCurrentPlayerAsFinished(); // includes passing on the turn
        }
        else{
            this.pass();
        }
    }

    getCurrentRound(){
        return this.rounds.length > 0 ? this.rounds[this.rounds.length - 1] : null;
    }

    getCurrentPlayer(){
        return this.players[this.turnIndex];
    }

    // TODO: Maybe construct some classes for these...
    initDeck(){
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
}


class Server {
    constructor(){
        this.clients = new Clients()
        this.game = new Game([], "init"); 
    }

    getSession(session_token){
        return this.clients.getClient(session_token);
    }

    getPublicGameInfo(){
        console.log(this.game.rounds.length);

        if(this.game.rounds.length > 0){
            console.log(this.game.getCurrentRound().lastNumberPlayed);
        }

        // Mask hands as those are not public info
        return {...this.game, hands: null}
    }
}

let server = new Server();

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

IO.on("connection", client => {
    console.log('Client %j connected to server', client.id);

    client.on('login', data => {
        console.debug('Received login message');

        // TODO real login :D
        if(data.password !== data.username + '22'){
            console.warn("Invalid password!")
            client.emit('logged_out')
            return;
        }

        let token = Crypto.randomBytes(48).toString('hex');

        let client_session = new Client(token, data.username);

        server.clients.addClient(client_session);
        //emit logged_in for debugging purposes of this example
        client.emit('logged_in', client_session);
    });

    // Check session data via socket
    client.on('checksession', session_token => {
        console.debug('Received checksession message');
        const session = server.clients.getClient(session_token);

        client.emit('sessiondata', session);
        client.emit('updateGame', server.getPublicGameInfo());
    });

    // Unset session data via socket
    client.on('logout', session_token => {
        console.debug('Received logout message');

        let session = server.clients.getClient(session_token);

        server.clients.removeClient(session_token);
        //emit logged_out for debugging purposes of this example
        console.debug('Logged out session %j.', session);

        client.emit('logged_out', session);
    });

    client.on("join", data => {
        // let playerSocketId = client.id;
        let playerName = data;
        let newPlayer = new Player(playerName);
        server.game.addPlayer(newPlayer);
        console.log("Players: " + server.game.players.length)
        IO.emit('updateGame', server.getPublicGameInfo());
    });

    client.on("start", data => {
        server.game.start();

        IO.emit('updateGame', server.getPublicGameInfo());
    });

    client.on("pass", data => {
        console.log("Pass")
        server.game.pass();

        IO.emit('updateGame', server.getPublicGameInfo());
    });

    client.on('play', action => {
        let playerName = server.clients.getClientName(action.token);
        let playAction = new PlayAction(action.cards, playerName);
        server.game.play(playAction);

        IO.emit('updateGame', server.getPublicGameInfo());
        client.emit('updateHand', server.game.hands[playerName]);
    });

    client.on('getHand', token => {
        let playerName = server.clients.getClientName(token);
        console.log('Getting hand for player ' + playerName);
        client.emit('updateHand', server.game.hands[playerName]);
    });
});

