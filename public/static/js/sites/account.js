var app = new Vue({
  el: '#app',
  data() {
    return {
      account: account,
      history: null,
      pending: null
    }
  },
  mounted() {
    axios
      .get('/api/accounts/' + this.account + '/history')
      .then(response => (this.history = response.data))


    axios
      .get('/api/accounts/' + this.account + '/pending')
      .then(response => (this.pending = response.data))
  },
  filters: {
    toMnano: function (value) {
      if (!value) return ''
      value = value.toString()

      multNANO = Big('1000000000000000000000000000000');

      return Big(value).div(multNANO).toFixed().toString()
    },
    formatHash: function (hash) {
      if (!hash) return ''
      hash = hash.toString()

      var first = hash.substring(0, 2);
      var middle_raw = hash.substring(2, 62);
      var last = hash.substring(62, 64);

      var middle = '';

      for (const part of middle_raw.match(/.{1,6}/g)) {
        middle = middle + '<span class="hashcolor" style="color:#' + part + ';background-color:#' + part + '">' + part + '</span>';
      }

      return first + middle + last;
    }
  }
})