const express = require('express')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')

const http = require('http')
const path = require('path')

const api = require('./api.js')


// express is our backend-framework
const app = express()
const config = require('./webpack.config.js')
const compiler = webpack(config)

// Tell express to use the webpack-dev-middleware
app.use(webpackDevMiddleware(compiler, {
    publicPath: '/',
}))


app.set('port', 5000);
app.set('views', path.join(__dirname, '/dist'))

// Sets up an Server that uses the http-protocol
const server = http.Server(app)

// creates a socket 
const io = api(server)

server.listen(5000, function() {
    console.log('Starting server on port 5000');
});