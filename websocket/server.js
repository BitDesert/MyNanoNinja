
var WebSocketServer = require('ws').Server

var wss

function toEvent(message) {
  try {
    const parsedmessage = JSON.parse(message)
    this.emit(parsedmessage.action, parsedmessage)
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

  wss.on('connection', function (ws, req) {
    const ip = req.socket.remoteAddress;
    var ip_forwarded = 'x-forwarded-for'
    try {
      ip_forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
    } catch (error) {
      // no error
    }
    console.log('WS: New connection', ip, ip_forwarded)

    ws.isAlive = true
    ws.accounts = []

    ws.on('message', toEvent)
      .on('ping', function (data) {
        console.log('WS: Ping', ip, ip_forwarded)
        heartbeat(ws)
        return sendMessage(ws, { ack: 'pong' })
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

            return sendMessage(ws, { ack: 'subscribe' })

          } else {
            return sendError(ws, 'malformed options')
          }
        } catch (error) {
          console.log(error);
          return sendError(ws, 'malformed message')
        }
      })
      .on('unsubscribe', function (data) {
        try {
          if (data.topic !== 'confirmation') {
            sendError(ws, 'topic not supported')
            return
          }

          ws.accounts = []

          return sendMessage(ws, { ack: 'unsubscribe' })

        } catch (error) {
          console.log(error);
          return sendError(ws, 'malformed message')
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

// const interval = setInterval(() => {
//   wss.clients.forEach((ws) => {
//     if (ws.isAlive === false) {
//       return ws.terminate()
//     }

//     ws.isAlive = false
//     ws.ping(() => { ping(ws) })
//   })
// }, 2 * 60 * 1000)

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
