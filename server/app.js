const Express = require("express")();
const Http = require("http").Server(Express);
const Server = require("socket.io")(Http);
const Deck = require("card-deck");
const MinPlayers = 3;

var game = {
    players: [],
    state: "init"
}

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

Server.on("connection", client => {
    client.emit("game", game);
    client.on("join", data => {
        let playerSocketId = client.id;
        let playerName = data;

        // Prevent same sesison joining multiple times
        if(game.players.find(x => x.id === playerSocketId)){
            console.log("Player already joined in this game!")
            return;
        }

        console.log("new player");
        console.log("- name: " + playerName)
        console.log("- id: " + playerSocketId);
        let newPlayer = {"name": playerName, "id": playerSocketId };
        game.players.push(newPlayer);
        console.log("Players: " + game.players.length)
        Server.emit("game", game);
    });

    client.on("start", data => {
        if(game.players.length >= MinPlayers){
            console.log("Starting the game...")
            game.state = "started";
            Server.emit("game", game);
        }
        else{
            console.warn("Not enough players to start the game!")
        }
    });
});