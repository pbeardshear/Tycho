var _ = require('underscore'),
	Class = require('./class');

require('./mixins');

// -------------------------------------------------------------------------------
// Game world - represents a single instance of a game running on a server
// 				each instance is contained, and a server will generally 
//				manage multiple instances to handle player load
// -------------------------------------------------------------------------------

World = Class.extend({
	mixins: ['eventable'],
	
	players = {},
	entities = {},
	
	init: function (id, maxPlayers) {
		this.id = id;
		this.maxPlayers = maxPlayers;
		this.numPlayers = 0,
		
		this.players = {};
		this.entities = {};
	}
});

// Methods
World.prototype = ({
	
}).mixin(['eventable']);

module.exports = World;
