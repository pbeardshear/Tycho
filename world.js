var _ = require('underscore');

require('./mixins');
require('./eventable');

// -------------------------------------------------------------------------------
// Game world - represents a single instance of a game running on a server
// 				each instance is contained, and a server will generally 
//				manage multiple instances to handle player load
// -------------------------------------------------------------------------------

World = function (id, maxPlayers) {
	// Mixins
	this.mixin(['eventable']);
	
	// Constructor
	this.id = id;
	this.maxPlayers = maxPlayers;
	this.numPlayers = 0;
	
	this.players = { };
	this.entities = { };
	
};

// Methods
World.prototype = {
	
};

module.exports = World;