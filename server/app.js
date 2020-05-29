'use strict';

const Express = require("express");
const App = Express();
const Http = require("http").Server(App);
const IO = require("socket.io")(Http);
const Crypto = require('crypto');

const MinPlayers = 1; // TODO should be 4

// Declare classes
const Server = require("./Classes/Server")
const Player = require("./Classes/Player")
const Client = require("./Classes/Client")
const PlayAction = require("./Classes/PlayAction")
const Round = require("./Classes/Round")

let server = new Server();

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

IO.on("connection", client => {
    console.log('Client %j connected to server', client.id);

    client.on('login', data => {
        console.debug('Received login message');

        // TODO real login :D
        if (data.password !== data.username + '22') {
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

