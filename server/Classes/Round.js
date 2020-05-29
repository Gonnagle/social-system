module.exports = class Round {
    constructor() {
        this.plays = [];
        this.amountOfCardsToPlay = -1;
        this.lastNumberPlayed = 999;;
        this.lastPlayer = null;
    }

    play(playAction) {
        if (this.plays.length > 0) {
            console.log('Not first play in round -> validating the play');

            if (playAction.cards.length !== this.amountOfCardsToPlay) {
                console.error('Cards to play on round: ' + this.amountOfCardsToPlay + ' received play with ' + playAction.cards.length + ' cards!');
                throw new Error('Invalid amount of cards played!');
            }
            if (playAction.getEffectiveNumber() >= this.lastNumberPlayed) {
                console.error('Last number played on round: ' + this.lastNumberPlayed + ' received play with number' + playAction.getEffectiveNumber());
                throw new Error('Too big number played!');
            }
        }

        this.plays.push(playAction);
        this.lastNumberPlayed = playAction.getEffectiveNumber();
        this.setLastPlayer(playAction.player);

        // On first action set also the amount of cards to play on this round
        if (this.amountOfCardsToPlay === -1) {
            console.log('Setting round amountOfCardsToPlay to ' + playAction.cards.length);
            this.amountOfCardsToPlay = playAction.cards.length;
        }
    }

    setLastPlayer(player) {
        this.lastPlayer = player;
    }

    getLastPlayer() {
        return this.lastPlayer;
    }
}