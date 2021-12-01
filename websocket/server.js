
var WebSocketServer = require('ws').Server

var wss

function toEvent(message) {
  try {
    const parsedmessage = JSON.parse(message)
    this.emit(parsedmessage.action, parsedmessage)
    console.log('WS ACTION:', parsedmessage.action);
  } catch (ignore) {
    this.emit(undefined, message)
  }
}

function init(server) {
  wss = new WebSocketServer({
    noServer: true
  })

  server.on('upgrade', function upgrade(request, socket, head) {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', function (ws) {
    console.log('WS: New connection')

    ws.isAlive = true
    ws.accounts = []

    ws.on('message', toEvent)
      .on('ping', function (data) {
        heartbeat(ws)
        sendMessage(ws, { action: 'pong' })
      })
      .on('pong', function (data) {
        heartbeat(ws)
      })
      .on('subscribe', function (data) {
        try {
          if (data.topic !== 'confirmation') {
            sendError(ws, 'topic not supported')
            return
          }

          if (data.options.accounts.length > 0) {
            ws.accounts = data.options.accounts

          } else {
            sendError(ws, 'malformed options')
          }
        } catch (error) {
          console.log(error);
          sendError(ws, 'malformed message')
        }
      })
      .on('unsubscribe', function (data) {
        try {
          if (data.topic !== 'confirmation') {
            sendError(ws, 'topic not supported')
            return
          }

          ws.accounts = []

        } catch (error) {
          console.log(error);
          sendError(ws, 'malformed message')
        }
      })
  })
};

function sendError(client, error) {
  console.log('WS ERROR:', error);
  sendMessage(client, { error })
}
function sendMessage(client, data) {
  client.send(JSON.stringify(data))
}

const heartbeat = (ws) => {
  ws.isAlive = true
}

const ping = (ws) => {
  sendMessage(ws, { action: 'ping' })
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping(() => { ping(ws) })
  })
}, 2 * 60 * 1000)

function sendAccount(account, data) {
  wss.clients.forEach(client => {
    if (client.accounts.includes(account)) {
      console.log('WS - Found client for account', account);
      sendMessage(client, data)
    }
  })
}

module.exports = {
  init,
  sendAccount
}
