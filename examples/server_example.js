//
//	Server.js
//

// Represents a game server, using spine.js
var spine = require('./spine'),
	Messages = require('./messages'),
	World = require('./world');


spine.createServer({
	// Set the max number of concurrent connections this server will accept
	maxConnections: 1000,
	
	// Set the valid message types that this server will accept from the client
	accept: Messages,
	
	// Tell spine not to split instances to manage load
	// DEPRECATED: Assumed true by default
	useInstances: true,
	
	
	
	// The object type to wrap an instance
	instanceType: World,
	
	// Allows connecting to instances by name, rather than auto-assigning a connection to an instance
	// This is useful if your instances are games that players are able to join
	namedInstances: true,
	
	
});

// Start the server
spine.listen(3000);

