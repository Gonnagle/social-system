<template>
  <div id="app">
    <h2>Powered by:</h2>
    <img alt="Vue logo" src="./assets/logo.png">
    <ClassSystemGame msg="Welcome to Class-System Game.js App"/>
  </div>
</template>

<script>
import ClassSystemGame from './components/ClassSystemGame.vue'

export default {
  name: 'App',
  components: {
    ClassSystemGame
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
