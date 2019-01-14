var app = new Vue({
  el: '#app',
  data() {
    return {
      account: account,
      history: null,
      pending: {},
      info: null
    }
  },
  mounted() {
    axios
      .get('/api/accounts/' + this.account + '/history')
      .then(response => (this.history = response.data))


    axios
      .get('/api/accounts/' + this.account + '/pending')
      .then(response => (this.pending = response.data))

    axios
      .get('/api/accounts/' + this.account + '/info')
      .then(response => (this.info = response.data))
  }
})