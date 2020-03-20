const Express = require("express")();
const Http = require("http").Server(Express);
const SocketIO = require("socket.io")(Http);

var position = {
    x: 200,
    y: 200
};

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

SocketIO.on("connection", socket => {
    socket.emit("position", position);
    socket.on("move", data => {
        switch(data) {
            case "left":
                position.x -= 5;
                SocketIO.emit("position", position);
                break;
            case "right":
                position.x += 5;
                console.log("emit position " + position.x)
                SocketIO.emit("position", position);
                break;
            case "up":
                position.y -= 5;
                SocketIO.emit("position", position);
                break;
            case "down":
                position.y += 5;
                SocketIO.emit("position", position);
                break;
        }
    });
});