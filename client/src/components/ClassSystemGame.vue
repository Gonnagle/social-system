<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <h2>Powered by Vue.js</h2>
    <p>
      For a guide and recipes on how to configure / customize this project,<br>
      check out the
      <a href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli documentation</a>.
    </p>
    <h3>Installed CLI Plugins</h3>
    <ul>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel" target="_blank" rel="noopener">babel</a></li>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint" target="_blank" rel="noopener">eslint</a></li>
    </ul>
    <div ref="game">
      <p>
        status: {{ status }}
      </p>
      <button v-on:click="move('right')">Right</button>
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
        status: "init",
        position: {
          x: 0,
          y: 0
        }
      }
    },
    created() {
      this.socket = io("http://localhost:3000");
      this.status = "created"
      console.log("created " + this.status)
    },
    mounted() {
      this.status = "mounted";
      this.socket.on("position", data => {
        this.position = data;
        this.status = this.position.x;
        console.log("socket on " + this.status)
      });
      console.log("test")
    },
    methods: {
      move(direction) { this.socket.emit("move", direction); },
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
