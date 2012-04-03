var _ = require('underscore'),
	io = require('socket.io'),
	static = require('node-static'),
	http = require('http');

var fileServer = new static.Server();
// Create the static file server
http.createServer(function (request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response);
	});
}).listen(8080);