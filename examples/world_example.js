//
//	World_example.js
//

// An example of how to structure your app to use spine.
// A world is our app's abstraction of a spine instance.
// 
// Players connect to instances, which are self-contained.
// spine uses instances to balance load on the client side,
// so as to minimize the amount of data that needs to be sent
// on update.
//

var spine = require('./spine'),
	Player = require('./player');

World = Class.extend({
	// constructor
	init: function () { },
	
	// The internal object for spine to associate with a connection
	// All connection types will be abstracted as the object given as argument
	connectionType: Player,
	
	// spine will hook into these handlers, and call them when the appropriate events occur
	// Player connects to this instance
	onConnect: function () { },
	
	// Player drops out of the game
	onDrop: function () { },
	
	// Player sends a message up to the server instance
	onMessage: function () { }
});

module.exports = World;

