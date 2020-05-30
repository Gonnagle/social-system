const Deck = require("card-deck");
const MinPlayers = 1; // TODO should be 4
module.exports = class Game {
    constructor(players, state) {
        this.players = players;
        this.finishedPlayers = [];
        this.hands = {};
        this.state = state;
        this.deck = this.initDeck();
        this.turnIndex = 0;
        this.rounds = [];
    }

    addPlayer(player) {
        // Prevent same sesison joining multiple times
        if (this.players.find(x => x.name === player.name)) {
            console.log("Player already joined in this game!")
            return;
        }

        console.log("new player");
        console.log("- name: " + player.name)

        // TODO actual ranks
        if (player.rank == null) {
            player.rank = this.players.length + 1
        }

        console.log("- rank: " + player.rank);

        this.players.push(player);
    }

    deal() {
        let deckSize = this.deck.remaining();
        console.log("Deck size: " + deckSize);
        let minSizeOfHand = Math.floor(deckSize / this.players.length);
        console.log("Min size of hand: " + minSizeOfHand);
        let amountOfExtraCards = deckSize - minSizeOfHand * this.players.length;
        console.log("Extra cards: " + amountOfExtraCards);
        console.log("Amount of players: " + this.players.length);

        this.players.forEach(player => {
            let drawAmount = minSizeOfHand;

            if (amountOfExtraCards > 0) {
                ++drawAmount;
            }

            console.log("Drawing " + drawAmount)

            let hand = this.deck.draw(drawAmount);
            hand.sort((a, b) => a.number - b.number);
            this.hands[player.name] = hand;
            console.log("Hand has " + hand.length)
        });
    }

    start() {
        if (this.state != "init") {
            console.error("Can not start game that is not in init state!");
            return;
        }

        if (this.players.length >= MinPlayers) {
            console.log("Starting the game...")
            this.state = "started";
            // Sort by rank
            this.players.sort((a, b) => a.rank - b.rank);

            this.deal();

            let firstRound = new Round();
            this.rounds.push(firstRound);
        }
        else {
            console.warn("Not enough players to start the game!")
        }
    }

    pass() {
        this.passTurnToNextPlayer();

        let currentRound = this.getCurrentRound();

        if (currentRound.getLastPlayer() === this.getCurrentPlayer().name) {
            console.log('Player ' + this.getCurrentPlayer().name + " won the round! Starting new round...");
            let newRound = new Round();
            this.rounds.push(newRound);
        }
    }

    removeCurrentPlayerAsFinished() {
        let player = this.players.splice(this.turnIndex, 1)[0];

        this.finishedPlayers.push(player); // TODO updating ranks?

        // Only one player left -> game finished
        if (this.players.length === 1) {
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

    passTurnToNextPlayer() {
        console.log('Passing turn to the next player')
        ++this.turnIndex;
        if (this.turnIndex >= this.players.length) {
            this.turnIndex = 0;
        }
    }

    play(playAction) {
        let playerInTurn = this.getCurrentPlayer();

        if (playerInTurn.name !== playAction.player) {
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
        if (playersHand.length === 0) {
            console.log('Player ' + playAction.player + ' is out of the game!');
            this.removeCurrentPlayerAsFinished(); // includes passing on the turn
        }
        else {
            this.pass();
        }
    }

    getCurrentRound() {
        return this.rounds.length > 0 ? this.rounds[this.rounds.length - 1] : null;
    }

    getCurrentPlayer() {
        return this.players[this.turnIndex];
    }

    // TODO: Maybe construct some classes for these...
    initDeck() {
        console.log("Initializing the deck")
        const cards = [...Array(1).fill({ number: 1, name: "One" }),
        ...Array(2).fill({ number: 2, name: "Two" }),
        ...Array(3).fill({ number: 3, name: "Three" }),
        ...Array(4).fill({ number: 4, name: "Four" }),
        ...Array(5).fill({ number: 5, name: "Five" }),
        ...Array(6).fill({ number: 6, name: "Six" }),
        ...Array(7).fill({ number: 7, name: "Seven" }),
        ...Array(8).fill({ number: 8, name: "Eight" }),
        ...Array(9).fill({ number: 9, name: "Nine" }),
        ...Array(10).fill({ number: 10, name: "Ten" }),
        ...Array(11).fill({ number: 11, name: "Eleven" }),
        ...Array(12).fill({ number: 12, name: "Twelve" }),
        ...Array(2).fill({ number: 13, name: "Joker" }),
        ]

        console.log(cards.length);
        var deck = new Deck(cards);
        deck.shuffle();

        return deck;
    }
}