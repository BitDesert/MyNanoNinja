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
        server_cpu: '',
        server_ram: '',
        account_website: '',
        donation: {
          account: null,
          website: null
        },
        closing: false
      }
    }
  },
  mounted() {
    axios
      .get("/api/accounts/" + this.address)
      .then(response => {
        this.account = response.data;
        this.account.isOnline = moment(this.account.lastVoted).add(1, 'day').isAfter(/*now*/)
        if(moment(this.account.lastVoted).add(10, 'minutes').isAfter(/*now*/)){
          this.account.status = 'online';
        } else if(moment(this.account.lastVoted).add(1, 'day').isAfter(/*now*/)) {
          this.account.status = 'unstable';
        } else {
          this.account.status = 'offline';
        }
        console.log('STATUS', this.account.status);
        

        if (response.data.alias)
          this.editAccount.account_alias = response.data.alias;

        if (response.data.description)
          this.editAccount.account_description = response.data.description;

        if (response.data.website)
          this.editAccount.account_website = response.data.website;

        if (response.data.closing)
          this.editAccount.closing = response.data.closing;

        if (response.data.server){
          if (response.data.server.type)
            this.editAccount.server_type = response.data.server.type;
  
          if (response.data.server.cpu)
            this.editAccount.server_cpu = response.data.server.cpu;
  
          if (response.data.server.ram)
            this.editAccount.server_ram = response.data.server.ram;
        }
      })
      .catch(reason => {
        console.error(reason);
      });

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
          server_type: '' + this.editAccount.server_type,
          server_cpu: '' + this.editAccount.server_cpu,
          server_ram: '' + this.editAccount.server_ram,
          donation: this.editAccount.donation,
          closing: this.editAccount.closing,
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