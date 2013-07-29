Tycho
==========

A simple real-time multiplayer game framework for node.js.

```js
var tycho = require('tycho');

tycho.init({
	run: 'main.js',
	servers: [{...}]
});
```

Tycho provides game developers with a simple API for interacting with clients across different platforms and protocols.  The goal is to allow developers to focus on writing games, without having to worry about communication or distribution.
The architecture of Tycho is inherently distributed, using node's cluster API to fork child processes.  Developers provide an entry file which is executed in the context of tycho on each worker process.

## Basic Example
The most basic usage of Tycho is:
```js
var tycho = require('tycho');

tycho.init({
	run: 'main.js',
	servers: [{
		type: tycho.constants.connectionTypes.TCP,
		port: 8080
	}]
});
```

which runs the file ```main.js``` in each worker, and accepts TCP connections on port 8080.  The file ```main.js``` exposes a function which is executed when the worker process is ready to begin accepting client connections:

```js
// main.js

module.exports = function (tycho) {
	tycho.on('request', function (req) {
		// Received a new connection request
		// Return true/false to accept or deny the request
	});

	tycho.on('connect', function (connection) {
		// A new connection has been established
	});
};
```

## Tycho

### tycho.init(config)
This method is only available in the master process.

Initializes tycho and forks the worker processes.  ```config``` is an object which specifies all the settings in tycho.

Required:

* ```run```: filename of the entry file to execute in each worker process.  This file should expose a single function which will be called when the worker process is ready to begin accepting connections.
* ```servers```: ```Array``` of server config objects.  Each worker runs a server of each type supplied in the config.  Load-balancing between workers is handled very efficiently by the operating system.

Optional:

* ```workers```: ```int``` indicating how many workers to fork.  Defaults to ```os.cpus().length```.
* ```control```: config object for the tycho control server.  See the section on Control for possible config options.  Passing null will disable the control server.
* ```store```: config object for the store used by tycho for data storage and pub/sub.  Internally, tycho uses ```redis``` but will support extensions in the future, allowing developers to plug in their store of choice.
* ```log```: config object for the log used by tycho to output debug statements, warnings, and errors.  Passing null or ```{ enabled: false }``` will disable logging.
* ```reviveWorkers```: defaults to ```true```.  Indicates whether workers which die should be restarted.

### tycho.get(key, callback)
This method is only available in the worker process.

Retrieves any of the properties added by ```tycho.set()```.  The return value is passed as the first argument to ```callback```.

If the ```room``` flag is set, then this retrieves properties on room specified by the flag.

### tycho.set(key, value, callback)
This method is only available in the worker process.

Sets an arbitrary property value on the main tycho object.

If the ```room``` flag is set, then this arbitrary data with the room specified by the flag.

### tycho.room(name)
This method is only available in the worker process.

Sets the room flag to the room given by ```name```.  This is used in conjunction with ```.get()``` and ```.set()``` to store custom data with a room.  Example:

```js
tycho.room('lobby').set('name', 'Super Awesome Lobby');
tycho.room('just another game name').set('maxPlayers', 10);
```

In the second example, ```maxPlayers``` is a special property used by tycho to limit the number of connections allowed in one room.

### Events

#### request (request)
Emitted when a new connection request is set.  Listeners on this event must return a boolean indicating whether to accept the connection or not (```true```:accept, ```false```:reject).  The request object passed has the following properties:

* ```type```: the type of connection attempting to establish.  Different properties are provided on the request object based on the type of connection.
* ```address```: the IP address of the client attempting to connect.
* ```port```: the port of the client attempting to connect.  Only available on TCP and UDP requests.

The following properties are only provided on WebSocket requests:

* ```origin```: URL of the webpage from which the connection originated.  This property is ```null``` if the WebSocket connection did not originate from a browser.
* ```resource```: the resource path requested by the client.
* ```version```: version of WebSocket protocol requested by the client.

#### connect (connection)
Emitted when a new connection is established with a client.  See Connection below for information on how to the connection object.

#### pause (serverType)
Emitted when a server is paused.  ```serverType``` is a string which contains the type of the server being paused, and can be one of the following:

```js
TCP - 'tcp:server'
UDP - 'udp:server'
WebSocket - 'ws:server'
```

#### stop (serverType)
Emitted when a server is stopped.  ```serverType``` is a string which contains the type of the server being stopped, and are the same as those used for ```pause```.

#### httpRequest (request, response)
Emitted when a WebSocket server receives an HTTP request.  Note that http requests are denied by default in WebSocket servers, ```enableHTTP``` needs to be explicitly set to ```true``` to receive this event.  The ```request``` and ```response``` objects are the same as those passed in the node ```http``` module ([here](http://nodejs.org/api/http.html))

## Connection

### id [String]
A unique identifier for this connection.

### address [String]
A routable address for this connection.  Used in conjunction with ```connection.to(address)``` to send messages from one connection to another.

### send (message)
Sends the provided ```message``` to the client.  ```message``` can be either a string or an object.  If an object is passed, it will be serialized as JSON before sending.

### join (room, callback)
Joins the room given by ```room```, creating it if it didn't exist before.  The primary reason to have connections join rooms is to allow broadcasting messages to groups of connections.  ```room``` can be any valid string, and ```callback``` is a function which is passed a boolean value indicating whether the connection successfully joined the room.

### leave (room, callback)
Leaves the room given by ```room```.  ```callback``` is a function which is passed a boolean value indicating whether the connection successfully left the room.

### close ()
Closes the connection to the client.

### pause ()
Pauses the connection, preventing messages from being sent or received.  This can be used to throttle busy clients under load.

### in (room)
A flag which modifies ```send``` to broadcast to all connections in a room.  Example:
```js
connection.in('lobby').send('hey everybody!');
```

### to (address)
A flag which changes the client that a message is sent to.  This can be used effectively to send messages between clients.  Example:
```js
connection1.to(connection2.address).send('show me the money!');
// Message received at connection2
```

### get (key, callback)
Retrieves connection properties added by ```set()```.  ```callback``` is a function which is passed the stored value.  Example:
```js
// Earlier: connection.set('key', 'value');
//
// ...
connection.get('key', function (err, val) {
	// val == 'value'
});
```

### set (key, value, callback)
Sets an arbitrary property on this connection.  Developers should use this to store data associated with a client.  Example:
```js
connection.set('key', 'value', function (err, result) {
	// err is null if the set operation occurred successfully
});
```

## Servers

Tycho currently supports three server types, which are passed to ```tycho.init``` in the initial configuration, as objects in the ```servers``` array.

All server types support the following options:

* ```port```: port number to start the server on.  Note that TCP and WebSocket servers must be started on different ports.
* ```host```: host IP to start the server on.

### TCP
Enabled by passing a config object with a type of ```tycho.constants.connectionTypes.TCP```.

* ```noDelay```: defaults to ```true```.  Disables the Nagle algorithm, which causes data to be sent immediately without buffering.

### UDP
Enabled by passing a config object with a type of ```tycho.constants.connectionTypes.UDP```.

* ```type```: defaults to ```udp6```.  Valid values are ```udp4``` and ```udp6```.

### WebSocket
Enabled by passing a config object with a type of ```tycho.constants.connectionTypes.WEBSOCKET```.

* ```secure```: defaults to ```null```.  Forces ```wss://``` connections to the server.  To enable, pass an object with ```cert``` and ```key``` properties, or with a ```pfx``` property.  See the documentation [here](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) for information on required properties.
* ```noDelay```: defaults to ```true```.  Same as config option on TCP Server above.
* ```enableHTTP```: defaults to ```false```.  Set to true to receive 'httpRequest' events.  See Events under Tycho above for more information.

## Control
By default, Tycho starts a TCP server on port ```7331``` which accepts simple commands to manage or log Tycho behavior.  Unless indicated, all commands support an argument which specifies which server to send the command to.  Example:

```js
// Using node net library
var connection = net.connect(7331, function () {
	connection.write('start tcp'); 	// start all tcp servers
	connection.write('pause');		// pause all servers
});
```

* ```start```: starts a stopped server.
* ```pause```: pauses a running server.
* ```stop```: stops a running server.
* ```resume```: starts a paused server.
* ```heartbeat```: returns a serialized ```Object``` of the form: ```{ [workerID]: [running server list] }```.  ```[running server list]``` is a comma-separated string of server types running on the worker.
* ```stats```: returns a serialized ```Object``` of the form: ```{ [workerID]: [usage statistics] }```.  ```[usage statistics]``` is a 3-element array of [processID, memory usage, connection count].

## Documentation

Full documentation can be found at: http://pbeardshear.github.com/Tycho

## Tycho?

Back in 1994, a small Macintosh developer named Bungie released Marathon, the first in a trilogy of first-person shooter games.  The story of Marathon centers around
a security officer (you), and a rampant Artificial Intelligence named Durandal bent on escaping the eventual end of the universe.  In doing so, he leads an enslaved alien
race in a rebellion against their captors, who originally destroyed the ship you and Durandal were aboard and enslaved one
of the other AIs that was aboard the ship.  The enslaved AI's name was Tycho.  Tycho doesn't figure into the story as prominently as Durandal, but whenever he does you know you
are in for a treat.  His sarcastic and witty remarks are a fine counterpoint to Durandal's more straightforward approach, a testament to the excellent writing done
throughout the games.  If you've never played a Marathon game before, you owe it to yourself to visit Aleph One (http://source.bungie.org/), a community continuation of
the Marathon game engine following its release to the public in 1999.
