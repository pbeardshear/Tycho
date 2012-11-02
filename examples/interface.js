/**
 * Interface example for tycho.js
 *
 * Outlining the use cases for tycho, including code examples
 * for getting started.
 */


// Getting started
// Default setup code for all cases
var tycho = require('tycho'),
	server = tycho.createServer({...});

// 1.
// Lobby-based game
//
// Lobby-based games consist of three main elements:
// lobby, rooms, and users
//
// Tycho manages connections, and can act as the lobby for us
// In this case, we just need to spin up a new game when a room
// gets created


// This event is fired when tycho finishes setup and starts the server
// You should load any pre-state and scaffolding you need here
server.on('start', function () {
	this.lobby = new Lobby();
});

server.on('message', function (message, connection) {
	// Check the messages
	if (message.type === 'host') {
		// Create a new room
		this.lobby.push(new Room({...}));
	}
	else if (message.type === 'join') {
		this.lobby.find(message.roomID).join(connection);
	}
})


// 2.
// Instance-based game
//
// Games of this type allow players to come and go as they please,
// but generally separate groups of players into redundant copies
// of the game world, called instances.  MMOs and open-world games
// generally fit into this category.
//
// Tycho is able to group connections into bundles that can be
// managed together.

server.on('start', function () {
	this.worlds = [];
	for (var i = 0; i < config.worldCount; i++) {
		this.worlds.push(new World());
	}
});

// This event is called when a new connection is established
server.on('connection', function (connection) {
	// Add user to a world
	var player = new Player(connection),
		world = this.worlds.addUser(player);
	// Also, need to tell connection I joined a world
	connection.join(world);

	// Then, you can do things like
	connection.broadcast({
		type: 'join',
		player: player.id
	});
	// Which will send a message to every other connection
	// in the same world
});


// Start the server
// Can specify an optional host address and port
server.start(3000);


// 3.
// Peer-to-peer
//
// Peer-to-peer is a very useful architecture for high-performance
// games, and tycho does provide some support for this.  The optional
// tycho client library includes configuration options for using
// client-side PeerConnections to connect directly to other browsers*.
// In this case, the tycho server would be set up in a similar way to
// a lobby-based game, and would perform discovery for players wanting
// to connect.
//
// * PeerConnection is still a very new technology, only supported loosely
// on the newest browsers (Chrome 20+, Firefox (Q4 2012)) at the time of 
// this writing.