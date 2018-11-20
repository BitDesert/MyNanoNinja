Vue.component('account-alias', {
  props: ['account'],
  data: function () {
    return {
      alias: null
    }
  },
  methods: {
    getAlias() {
      axios
        .get('/api/accounts/' + this.account)
        .then(response => (this.alias = response.data.alias))
    }
  },
  created() {
    this.getAlias();
  },
  template: '<a v-bind:href="\'/account/\'+ account"><span><b v-if="alias">{{alias}} - </b>{{ account }}</span></a>'
})

Vue.filter('toMnano', function (value) {
  if (!value) return ''
  value = value.toString()

  multNANO = Big('1000000000000000000000000000000');

  return Big(value).div(multNANO).toFixed().toString()
})

Vue.filter('formatHash', function (hash) {
  if (!hash) return ''
  hash = hash.toString()

  var first = hash.substring(0, 2);
  var middle_raw = hash.substring(2, hash.length-2);
  var last = hash.substring(hash.length-2, hash.length);

  var middle = '';

  for (const part of middle_raw.match(/.{1,6}/g)) {
    middle = middle + '<span class="hashcolor" style="color:#' + part + ';background-color:#' + part + '">' + part + '</span>';
  }

  return first + middle + last;
})