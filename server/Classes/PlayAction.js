module.exports = class PlayAction {
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