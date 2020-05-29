const Clients = require("./Clients")
const Game = require("./Game")

module.exports = class Server {
    constructor() {
        this.clients = new Clients()
        this.game = new Game([], "init");
    }

    getSession(session_token) {
        return this.clients.getClient(session_token);
    }

    getPublicGameInfo() {
        console.log(this.game.rounds.length);

        if (this.game.rounds.length > 0) {
            console.log(this.game.getCurrentRound().lastNumberPlayed);
        }

        // Mask hands as those are not public info
        return { ...this.game, hands: null }
    }
}