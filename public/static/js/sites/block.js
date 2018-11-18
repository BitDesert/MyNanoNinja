var app = new Vue({
  el: '#app',
  data() {
    return {
      hash: hash,
      block: null
    }
  },
  mounted() {
    axios
      .get('/api/blocks/' + this.hash)
      .then(response => (this.block = response.data))
  }
})