# My Nano Ninja

The perfect tool for Nano representatives lists and network statistics.

## What is Nano?

Nano's goal is to become "a global currency with instantaneous transactions and zero fees over a secure, decentralized network." More information is available over on the official [Nano repository](https://github.com/nanocurrency/raiblocks).

## Prerequisites

- Webserver like nginx as a reverse proxy
- MongoDB
- Nano Node with RPC enabled
- Node.js
- PM2 `npm install pm2 -g`

## Installation

Clone the repository to your server and install the dependencies with `npm i`.

After that copy the `ecosystem.config.sample.js` as `ecosystem.config.js` and edit the environment variables accordingly.

To start up the application execute `pm2 start ecosystem.config.js`.

It is recommended to put the application behind a proper webserver like nginx, a configuration for that could look like this:

```nginx
server {
        listen 80;
        listen [::]:80;

        server_name mynano.ninja;

        location / {
                proxy_pass http://127.0.0.1:4000;
        }
}
```