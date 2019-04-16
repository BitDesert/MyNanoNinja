var app = new Vue({
  el: '#app',
  data() {
    return {
      address: address,
      account: null,
      history: null,
      pending: {},
      info: null
    }
  },
  mounted() {
    axios
      .get("/api/accounts/" + this.address)
      .then(response => (this.account = response.data))
      .catch(reason => {});

    axios
      .get('/api/accounts/' + this.address + '/history')
      .then(response => (this.history = response.data))
      .catch(reason => {});

    axios
      .get('/api/accounts/' + this.address + '/pending')
      .then(response => (this.pending = response.data))
      .catch(reason => {});

    axios
      .get('/api/accounts/' + this.address + '/info')
      .then(response => (this.info = response.data))
      .catch(reason => {});
  }
})