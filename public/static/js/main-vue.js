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
        .catch(reason => {});
    }
  },
  created() {
    this.getAlias();
  },
  template: '<a v-bind:href="\'/account/\'+ account"><span><b v-if="alias">{{alias}} - </b>{{ account }}</span></a>'
})

Vue.component('account-alias-sm', {
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
        .catch(reason => {});
    }
  },
  created() {
    this.getAlias();
  },
  template: '<a v-bind:href="\'/account/\'+ account"><b v-if="alias">{{alias}}</b><span v-if="!alias">{{account.substring(0,10)}}...</span></a>'
})

Vue.filter('toMnano', function (value) {
  if (!value) return ''
  value = value.toString()

  multNANO = Big('1000000000000000000000000000000');

  return Big(value).div(multNANO).toFixed(6).toString()
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

Vue.filter('toCurrency', function (value) {
  if (typeof value !== "number") {
      return value;
  }
  var formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
  });
  return formatter.format(value);
});

Vue.filter('toLocaleString', function (value) {
  if(isNaN(value)) return '0';
  return Number.parseFloat(value).toLocaleString()
})

Vue.filter('momentFromNow', function (value) {
  return moment(value).fromNow();
})