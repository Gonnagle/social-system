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
      <input v-model="playerName" placeholder="Player name">
      <button :disabled="playerName.length <= 0 || joined" v-on:click="join(playerName)">Join game</button>
      <p>Players:</p>
      <ul id="player-list">
        <li v-for="player in players" :key="player.id">
          {{ player.name }}
        </li>
      </ul>
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
        players: [],
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
      this.socket.on("players", data => {
        this.players = data;
        this.playerCount = this.players.length;
        console.log("Player count updated to: " + this.playerCount)
      });
      console.log("test")
    },
    methods: {
      join(playername) { 
        this.socket.emit("join", playername);
        this.joined = true; 
      },
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
