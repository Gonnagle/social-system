'use strict';

const Express = require("express")();
const Http = require("http").Server(Express);
const IO = require("socket.io")(Http);
const Deck = require("card-deck");

const MinPlayers = 1; // TODO should be 4

class Player {
    constructor(id, name){
        this.id = id;
        this.name = name;
        this.rank = null; // TODO
    }
}

class Game {
    constructor(players, state){
        this.players = players;
        this.state = state;
        this.deck = InitDeck();
    }

    addPlayer(player){
        // Prevent same sesison joining multiple times
        if(game.players.find(x => x.id === playerSocketId)){
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
}

var game = new Game([], "init");

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

IO.on("connection", client => {
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
        if(game.state != "init"){
            console.error("Can not start game that is not in init state!");
            return;
        }

        if(game.players.length >= MinPlayers){
            console.log("Starting the game...")
            game.state = "started";

            game.deal();

            IO.emit("game", game);
        }
        else{
            console.warn("Not enough players to start the game!")
        }
    });
});

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