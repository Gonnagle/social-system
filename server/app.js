const Express = require("express")();
const Http = require("http").Server(Express);
const SocketIO = require("socket.io")(Http);

var players = [];

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

SocketIO.on("connection", socket => {
    socket.emit("players", players);
    socket.on("join", data => {
        let playerSocketId = socket.id;
        let playerName = data;
        console.log("new player");
        console.log("- name: " + playerName)
        console.log("- id: " + playerSocketId);
        let newPlayer = {"name": playerName, "id": playerSocketId };
        players.push(newPlayer);
        console.log("Players: " + players.length)
        SocketIO.emit("players", players);
    });
});