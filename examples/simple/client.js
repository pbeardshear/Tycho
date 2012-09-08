$(function () {
	// Helper methods
	function printMessage(source, message) {
		var content = ('<span class="message-source {0}">[{0}]: </span>'.replace(/{(0)}/g, source)) + message;
		$(receive).append('<p class="server-message">' + content + '</p>');
	}
	
	function clearInput() {
		$(messageData).val('');
	}
	
	// Dom references
	var receive = $('#message-receive'),
		send = $('#message-send'),
		messageData = $('#message-data');
	
	// Handlers
	$('#submit').on('click', function () {
		printMessage('client', $(messageData).val());
		tycho.Messages.send('another');
	});
	$(messageData).on('keydown', function (e) {
		// Check if enter
		if (e.keyCode == 13) {
			$('#submit').click();
		}
	});
	
	// Define messages that we can send up to the server
	tycho.Messages.define({
		sample: {
			init: function () { },
			serialize: function () { return 'this is a sample message'; }
		},
		another: {
			init: function () {
				this.data = $(messageData).val();
			},
			validate: function () {
				return this.data != '';
			},
			serialize: function () {
				return ['Message title', this.data];
			}
		}
	});
	// Bind a handler to a message from the server
	tycho.Messages.accept('response', function (o) {
		console.log(o);
		printMessage('server', o);
		clearInput();
	});
	// Make a socket connection to the tycho server
	tycho.connect();
	
	// Send off a sample message
	tycho.Messages.send('sample');
});
