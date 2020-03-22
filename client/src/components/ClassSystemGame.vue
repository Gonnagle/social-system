<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <h2>Getting started links</h2>
    <ul>
      <li><a href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli documentation</a></li>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel" target="_blank" rel="noopener">babel</a></li>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint" target="_blank" rel="noopener">eslint</a></li>
    </ul>
    <div ref="game">
      <p>
        Player count: {{ playerCount }}
      </p>
      <p>
        State: {{ game.state }}
      </p>
      <input :disabled="joined" v-model="playerName" placeholder="Player name">
      <button :disabled="playerName.length <= 0 || joined" v-on:click="join(playerName)">Join game</button>
      <button v-on:click="start()">Start game</button>
      <p>Players:</p>
      <ul id="player-list">
        <li v-for="player in game.players" :key="player.id">
          [{{ player.rank}}] {{ player.name }}
        </li>
      </ul>
      <div v-if="game.state === 'started'">
        <p v-if="myTurn">Your turn!</p>
        <p v-else>Player {{ game.players[game.turnIndex].name }} is thinking...</p>
        <ul id="hand">
          <!-- TODO index as a temp key... -->
          <li v-for="(card, index) in hand" :key="index">
            {{ card.number }} {{ card.name }}
            <button v-if="myTurn" v-on:click="pick(card, index)">Pick</button>
          </li>
        </ul>
      </div>
    </div>
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
        game: {
          players: []
        },
        hand: [],
        myTurn: false,
        joined: false,
        playerCount: 0,
        playerName: ""
      }
    },
    created() {
      this.socket = io("http://localhost:3000");
      console.log("created with " + this.playerCount + " players")
    },
    mounted() {
      this.socket.on("game", data => {
        this.game = data;
        this.playerCount = this.game.players.length;
        console.log("Player count updated to: " + this.playerCount)

        if(this.playerCount === 0){
          this.playerName = "";
        }

        // console.log(this.game.players.length);

        var that = this;

        if(this.game.state === "started"){
          // TODO should be getting only own hand...
          let myPlayerId = that.socket.id;
          that.hand = that.game.players.find(x => x.id === myPlayerId).hand;
          that.myTurn = that.game.players[that.game.turnIndex].id === myPlayerId;

          console.log(that.hand.length);
        }
      });
      console.log("test")
    },
    methods: {
      join(playerName) { 
        this.socket.emit("join", playerName);
        this.joined = true; 
      },
      start() {
        this.socket.emit("start");
      }, 
      pick(card, index) {
        console.log("Picked " + card.name + " (index: " + index + ")");
        // TODO check can that be played by itself or does somethgin else need to picked also
        // + leave only valid possibilities to be picked
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
