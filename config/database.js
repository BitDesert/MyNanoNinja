// config/database.js
module.exports = {

    'url' : process.env.MONGO_URL, // looks like mongodb://<user>:<pass>@<host>:<port>/<db>
    'sessionurl' : process.env.MONGO_SESSIONURL // looks like mongodb://<user>:<pass>@<host>:<port>/<db>, enter a different db name

};
