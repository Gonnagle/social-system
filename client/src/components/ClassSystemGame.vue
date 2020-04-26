<template>
  <div class="hello">
    <h1>{{ msg }}</h1>

    <div ref="game">
      <p>
        Player count: {{ playerCount }}
      </p>
      <p>
        State: {{ game.state }}
      </p>
      <div v-if="playerName === ''" id="login">
        <input v-model="username">
        <input v-model="password">
        <button v-on:click="login(username, password)">Login</button>
      </div>
      <div v-else>
        <button v-on:click="logout()">Logout</button>
      </div>

      Player name {{ playerName }}
      <button :disabled="playerName.length <= 0 || joined" v-on:click="join(playerName)">Join game</button>
      <button v-on:click="start()">Start game</button>
      <p>Players:</p>
      <ul id="player-list">
        <li v-for="player in game.players" :key="player.id">
          [{{ player.rank}}] {{ player.name }}
        </li>
      </ul>
      <div v-if="game.state === 'started'">
        <div>
          Previous actions on this round:
          <ul>
            <li v-for="(play, index) in currentRound.plays" :key="index">
              {{ play.player }}: <span v-for="(card, index2) in play.cards" :key="index2"> {{ card.number }}</span>
            </li>
          </ul>
        </div>
        <div v-if="myTurn">
          <p>Your turn!</p>
          <button v-on:click="pass()">Pass</button>
          <button v-on:click="play()">Play</button>
        </div>
        <div v-else>
          <p>Player {{ playerInTurn }} is thinking...</p>
        </div>
        <ul id="selected">
          SELECTED CARDS:
          <!-- TODO index as a temp key... -->
          <li v-for="(card, index) in pickedCards" :key="index">
            {{ card.number }} {{ card.name }}
            <button v-if="myTurn" v-on:click="returnToHand(card, index)">Remove</button>
          </li>
        </ul>
        <ul id="hand">
          HAND:
          <!-- TODO index as a temp key... -->
          <li v-for="(card, index) in hand" :key="index">
            {{ card.number }} {{ card.name }}
            <button v-if="myTurn && card.validOption" v-on:click="pick(card, index)">Pick</button>
          </li>
        </ul>
      </div>
      <p>Results:</p>
      <ul id="player-list">
        <li v-for="player in game.finishedPlayers" :key="player.id">
          [{{ player.rank}}] {{ player.name }}
        </li>
      </ul>
    </div>
    <button v-on:click="test()">Test</button>
  </div>
</template>

<script>
  import io from "socket.io-client";
  
  export default {
    name: 'ClassSystemGame',
    props: {
      msg: String
    },
    data() {
      return {
        socket: {},
        username: '',
        password: '',
        game: {
          players: [],
          finishedPlayers: [],
        },
        currentRound: {
          // TODO: Repeating the defaults from server side...
          plays: [],
          amountOfCardsToPlay: -1,
          lastNumberPlayed: 999,
          lastPlayer: null
        },
        hand: [],
        pickedCards: [],
        playerInTuirn: '',
        myTurn: false,
        joined: false,
        playerCount: 0,
        playerName: ''
      }
    },
    created() {
      this.socket = io("http://localhost:3000");
      console.log("created with " + this.playerCount + " players")
    },
    mounted() {
      var session_token = this.$cookies.get('session_token');

      console.log('Session token: ' + session_token);

      if(session_token){
        this.checkSession(session_token);
      }

      // Session handling stuff
      this.socket.on("sessiondata", data => {
        console.info("sessiondata event received. Check the console");
        console.info("sessiondata is ", data);

        if(data && data.username){
          console.log('Logged in user - setting username to ' + data.username);
          this.playerName = data.username;
        }
        else {
          this.playerName = '';
          this.$cookies.remove('session_token');
          console.log('Cleared up the previous login');
        }
      })

      this.socket.on("logged_in", data => {
        this.playerName = data.username;

        this.$cookies.set('session_token', data.token);
        console.info("logged_in event received. Check the console");
        console.info("sessiondata after logged_in event is ", data);
      })

      this.socket.on("logged_out", data => {
        this.playerName = '';
        this.$cookies.remove('session_token');
        console.info("logged_out event received. Check the console");
        console.info("sessiondata after logged_out event is ", data);
      })

      this.socket.on("updateGame", game => {
        this.game = game;
        this.playerCount = this.game.players.length;
        console.log("Player count updated to: " + this.playerCount);
        console.log('Received hands: ' + game.hands ?? game.hands.length);
        let session_token = this.$cookies.get('session_token');

        if(this.game.state === "started"){
          this.playerInTurn = this.game.players[this.game.turnIndex].name;

          if(this.playerInTurn === this.playerName){
            this.myTurn = true;
          }
          else{
            this.myTurn = false;
          }

          if(this.game.rounds){
            this.currentRound = this.game.rounds[this.game.rounds.length - 1];
            console.log('currentRound has ' + this.currentRound.plays.length + ' actions played');
          }
          else{
            console.log('no current round yet');
          }

          console.log('Getting hand based on token ' + session_token)
          this.socket.emit('getHand', session_token);
        }
      });

      this.socket.on("updateHand", hand => {
        this.hand = hand;
        this.pickedCards = [];
        console.log('Hand updated to ' + hand.length + ' cards');
        
        // TODO: This info should be coming from server already for the whole hand
        this.updateValidOptions();
      })
    },
    methods: {
      login(username, password) {
        this.socket.emit('login', {'username': username, 'password': password});
      },
      logout() {
        var session_token = this.$cookies.get('session_token');
        this.socket.emit('logout', session_token);
      },
      checkSession(token) {
        console.log('Checking session for token: ' + token);
        this.socket.emit('checksession', token);
      },
      join(playerName) { 
        this.socket.emit("join", playerName);
        this.joined = true; 
      },
      start() {
        this.socket.emit("start");
      }, 
      pick(card, index) {
        // TODO should have object to handle picking card (and to update what are valid actions after...)
        this.pickedCards.push(card);
        this.hand.splice(index, 1);
        console.log("Picked " + card.name + " (index: " + index + ")");

        this.updateValidOptions();
      },
      returnToHand(card, index) {
        this.hand.push(card);
        this.hand.sort((a,b) => a.number - b.number);
        this.pickedCards.splice(index, 1);
        console.log("Removed " + card.name + " (index: " + index + ")");

        this.updateValidOptions();
      },
      pass() {
        this.socket.emit("pass");
      },
      play() {
        console.log("Play! Playing " + this.pickedCards.length + " cards");
        let session_token = this.$cookies.get('session_token');
        let action = {
          cards: this.pickedCards,
          token: session_token
        }
        this.socket.emit("play", action);
      },
      test() {
        console.log("Test-button pushed");
      },
      updateValidOptions(){
        console.log(this.pickedCards.length + ' cards selected');
        
        // Init all to be invalid options
        this.hand.forEach(c => c.validOption = false);

        // Required amount of cards selected is not reached -> can select more
        if (this.pickedCards.length !== this.game.rounds[this.game.rounds.length - 1].amountOfCardsToPlay){
          // At least one non joker selected -> can only select same number & jokers
          if(this.pickedCards.length > 0 && this.pickedCards.some(c => c.number < 13)){
            let previousSelection = this.pickedCards.find(c => c.number < 13);
            console.log('Selected number is ' + previousSelection.number);
            this.hand.filter(c => c.number === 13 || c.number === previousSelection.number)
              .forEach(c => c.validOption = true);
          }
          // Otherwise can select anything lower than last played number
          else {
            let lastNumberPlayed = this.game.rounds[this.game.rounds.length - 1].lastNumberPlayed;
            console.log('Last number played was: ' + lastNumberPlayed);
            this.hand.filter(c => c.number < lastNumberPlayed)
              .forEach(c => c.validOption = true);
          }
        }
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
