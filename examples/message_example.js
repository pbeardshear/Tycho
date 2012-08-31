// Properties in brackets are optional
Message.Host = {
	// Set variables and do any preprocessing work
	[init]: function () { },
	// Validate that the message is good to go.  You should check null or invalid field values here, for example.
	// Return false to prevent the message from being sent to the server
	[validate]: function () { },
	// Define what data should be passed along to the server in this request.
	// Return a type (primitive, array, object (no functions)) that is serializable.
	serialize: function () { },
	// Define a callback that the server should execute when it is finished processing this message.
	[callback]: function () { }
};

// Example usage
// Will emit to the socket a message of the form:
// socket.emit('join', [playerID, gameID], callback);
Message.Join = {
	init: function () {
		this.player = App.Players.self;
		this.game = App.getSelectedGame();
	},
	validate: function () {
		return this.game != null && this.player != null;
	},
	serialize: function () {
		return [this.player.id, this.game.id];
	},
	callback: App.onJoin
};

// Several options are also available
// By default, all names are lowercased (i.e. Message.Join will be sent as socket.emit('join'))
// To prevent this, set the flag [forceName: true]


// Send the join message to the server
tycho.send(Message.Join);
// Send the host message to the server
tycho.send(Message.Host);


