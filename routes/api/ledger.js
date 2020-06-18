var express = require('express');
var router = express.Router();
var request = require('request');

const yandexUrl = 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=https://yadi.sk/d/fcZgyES73Jzj5T&sort=-created&limit=1';

router.get('/download', function (req, res) {
  request.get({
    url: yandexUrl,
    json: true
  }, function (err, response, data) {
    if (err || response.statusCode !== 200) {
      res.status(404).end();
    } else {
      res.redirect(data._embedded.items[0].file);
    }
  });
});

router.get('/checksum/sha256', function (req, res) {
  request.get({
    url: yandexUrl,
    json: true
  }, function (err, response, data) {
    if (err || response.statusCode !== 200) {
      res.status(404).end();
    } else {
      res.status(200).send(data._embedded.items[0].sha256);
    }
  });
});

router.get('/checksum/md5', function (req, res) {
  request.get({
    url: yandexUrl,
    json: true
  }, function (err, response, data) {
    if (err || response.statusCode !== 200) {
      console.log(err);
      
      res.status(404).end();
    } else {
      res.status(200).send(data._embedded.items[0].md5);
    }
  });
});

module.exports = router;