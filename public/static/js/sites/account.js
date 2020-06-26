var app = new Vue({
  el: '#app',
  data() {
    return {
      address: address,
      account: null,
      history: null,
      pending: {},
      info: null,
      modal: {
        editAccount: false
      },
      editAccount: {
        button_submit: 'Save',
        account_alias: '',
        account_description: '',
        server_type: '',
        server_renewable: '',
        account_website: '',
      }
    }
  },
  mounted() {
    axios
      .get("/api/accounts/" + this.address)
      .then(response => {
        this.account = response.data;

        if (response.data.alias)
          this.editAccount.account_alias = response.data.alias;

        if (response.data.description)
          this.editAccount.account_description = response.data.description;

        if (response.data.website)
          this.editAccount.account_website = response.data.website;
      })
      .catch(reason => { });

    axios
      .get('/api/accounts/' + this.address + '/history')
      .then(response => (this.history = response.data))
      .catch(reason => { });

    axios
      .get('/api/accounts/' + this.address + '/pending')
      .then(response => (this.pending = response.data))
      .catch(reason => { });

    axios
      .get('/api/accounts/' + this.address + '/info')
      .then(response => (this.info = response.data))
      .catch(reason => { });
  },
  methods: {
    submitEditAccount: function (e) {
      e.preventDefault();
      this.editAccount.button_submit = 'Saving...';

      axios
        .post('/api/editAccount', {
          account: this.address,
          account_alias: '' + this.editAccount.account_alias,
          account_description: '' + this.editAccount.account_description,
          account_website: '' + this.editAccount.account_website,
        }).then(response => {
          console.log('OK', response);
          this.editAccount.button_submit = 'Done!';
          setTimeout(function(){
            location.reload();
          }, 1000)
          
        }).catch(error => {
          console.log('CATCH', error.response);
          this.editAccount.button_submit = error.response.data.msg;
          
        })
    }
  }
})