var express = require('express');
var router = express.Router();
const axios = require('axios');
var apicache = require('apicache');
let cache = apicache.middleware

router.get('/goal', cache('5 minutes'),  async (req, res) => {
  var query = `{
    user(login: "BitDesert") {
      sponsorsListing {
        activeGoal {
          percentComplete
          kind
          targetValue
          title
          description
        }
      }
    }
  }`

  var graphqlres = await axios({
    method: 'POST',
    url: 'https://api.github.com/graphql',
    headers: { 'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN },
    data: { query }
  })

  res.json(graphqlres.data);
});

module.exports = router;