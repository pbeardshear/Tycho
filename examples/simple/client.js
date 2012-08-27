window.addEventListener('load', function () {
	var receive,
		send,
		messageData;
			
	function printMessage(source, message) {
		var p = document.createElement('p');
		p.setAttribute('class', 'server-message');
		p.innerHTML = tycho.util.format('<span class="message-source {0}">[{0}]: </span>', source) + message;
		receive.appendChild(p);
	}
	
	function clearInput() {
		messageData && (messageData.value = '');
	}
	
	tycho.init(3000);
	receive = document.getElementById('message-receive');
	send = document.getElementById('message-send');
	messageData = document.getElementById('message-data');
	
	// Set up message that we can send to server
	tycho.Messages.create('sample', {
		init: function () { },
		serialize: function () { return 'this is a sample message'; }
	});
	
	tycho.Messages.create('another', {
		init: function () {
			this.data = messageData.value;
		},
		validate: function () {
			return this.data != '';
		},
		serialize: function () {
			return ['Message title', this.data];
		}
	});
	
	// Set up namespace for accepted routes
	var routes = {
		response: function (o) {
			printMessage('server', o.data);
			clearInput();
		}
	};
	tycho.Messages.acceptMessages(routes);
	
	// Bind event handler
	document.getElementById('submit').addEventListener('click', function () {
		printMessage('client', messageData.value);
		tycho.Messages.send('another');
	});
	document.getElementById('message-data').addEventListener('keydown', function (e) {
		// Check if enter
		if (e.keyCode == 13) {
			var event = document.createEvent('Event');
			event.initEvent('click', true,  true);
			document.getElementById('submit').dispatchEvent(event);
		}
	});
	
	// Do a demo submit
	tycho.Messages.send('sample');
});