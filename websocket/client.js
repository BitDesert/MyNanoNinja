const WebSocket = require('ws')
var wsserver = require('./server')

var ws

function connectWS () {
  ws = new WebSocket(process.env.NODE_WS)
  ws.on('open', function () {
    console.log('socket open')
    wsStartup()
  })
  ws.on('error', function () {
    console.log('socket error')
  })
  ws.on('close', function () {
    console.log('socket close')
    setTimeout(connectWS, 1 * 1000)
  })
}
connectWS()

function wsSend (json) {
  ws.send(JSON.stringify(json))
}

function wsStartup () {
  wsSend({
    action: 'subscribe',
    topic: 'confirmation'
  })

  ws.on('message', function incoming (data) {
    data = JSON.parse(data)

    if (data.topic === 'confirmation') {
      sendWebsocket(data.message.block.link_as_account, data.message)
    }
  })
}

async function sendWebsocket (account, message) {
  wsserver.sendAccount(account, message)
}
