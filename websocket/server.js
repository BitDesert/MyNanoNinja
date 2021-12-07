
var WebSocketServer = require('ws').Server
var User = require('../models/user');
const RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory;

var wss

const opts = {
  points: 5,
  duration: 60 * 60, // in seconds
};

const rateLimiter = new RateLimiterMemory(opts);

function toEvent(message) {
  try {
    const parsedmessage = JSON.parse(message)
    console.log('WS: Action', parsedmessage.action)
    this.emit(parsedmessage.action, parsedmessage)
  } catch (ignore) {
    this.emit(undefined, message)
  }
}

isApiAuthorized = (req, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    next();

  } else {
    User.findOne({
        'api.key': authHeader
      })
      .select('api')
      .exec(function (err, user) {
        if (err || !user) {
          return next('User not found')
        }
        next(undefined, user);
      });
  }
}

consumePoints = async (ws, ip, consumePoints) => {
  if(ws.user){
    ws.user.api.calls_remaining = ws.user.api.calls_remaining - consumePoints;
    await ws.user.save();
    console.log('WS: User existing:', ws.user.api.calls_remaining);
    remainingPoints = ws.user.api.calls_remaining;
  } else {
    rateLimiterRes = await rateLimiter.consume(ip, consumePoints).catch((rateLimiterRes) => {return rateLimiterRes})
    remainingPoints = rateLimiterRes.remainingPoints;
  }

  if(remainingPoints <= 0){
    sendMessage(ws, { error: 'No more points'})
    return false
  } else {
    return remainingPoints
  }
}

function init(server) {
  wss = new WebSocketServer({
    noServer: true
  })

  server.on('upgrade', function upgrade(request, socket, head) {
    isApiAuthorized(request, function next(err, user) {
      if (err) {
        console.log('WS AUTH:', err);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request, user);
      });
    });
  })

  wss.on('connection', function (ws, req, user) {
    var ip = req.socket.remoteAddress;
    try {
      ip = req.headers['x-forwarded-for'].split(',')[0].trim();
    } catch (error) {
      // no error
    }
    console.log('WS: New connection', ip)

    ws.isAlive = true
    ws.accounts = []
    ws.user = user

    ws.on('message', toEvent)
      .on('ping', function (data) {
        heartbeat(ws)
        return sendMessage(ws, { ack: 'pong' })
      })
      .on('pong', function (data) {
        heartbeat(ws)
      })
      .on('subscribe', async (data) => {
        try {
          if (data.topic !== 'confirmation') {
            sendError(ws, 'topic not supported')
            return
          }

          if (data.options.accounts.length > 0) {
            ws.accounts = data.options.accounts

            remainingPoints = await consumePoints(ws, ip, 1)
            return sendMessage(ws, { ack: 'subscribe', remainingPoints })
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
