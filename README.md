Tycho
==========

A simple real-time multiplayer game framework for node.js.

```js
var tycho = require('tycho'),
	server = tycho.createServer();
	
server.listen(3000);
```

Tycho handles all of the real-time communication and architecture that are common across a majority of multiplayer games.  The purpose of Tycho is to allow prospective game developers
to focus on writing the logic specific to their game, and let Tycho handle the underlying communication between server and client.

## Background

At its core, Tycho maintains three levels of granularity - server, instance, and connection.  A connection encapsulates an individual client or user, and handles communication between
server and client.  Depending on the type of game, an instance would likely represent either an instance of the game world (where the world is persistent, e.g. MMO) or a collection
of users (e.g. board game, lobby-based game).  Tycho is written is such a way as to provide as much flexibility as possible when structuring your game code.

## How to use

```tycho.createServer``` is the main entry point for the Tycho framework, and is likely one of only a handful of places where you would need to reference tycho directly.
Hooking your game logic into tycho is as simple as passing a few configuration parameters:

```js
tycho.createServer({
	instanceType: Game,
	connectionType: User,
	maxConnection: 100
});
```

In this example, ```Game``` and ```User``` would be constructors of the user-defined classes that wrap the two tycho constructs.  Whenever tycho creates a new connection
(i.e. a new user connects), for example, an instance of the User class would also be created and automatically hooked into the tycho connection.  Any message or data from the client
is automatically routed to the User instance by tycho.

## Messaging

Tycho comes bundled with a default Messages class, but users are free to use any that they prefer.  Refer to the documentation for more details on specifying a custom messaging
interface.

Tycho's messaging interface looks like the following:

```js
var attack = tycho.Messages.create({
	init: function () { },
	validate: function () { },
	serialize: function () { },
	callback: function () { }
});
```

Of these four parameters, only serialize is required.  init is called each time a new message of the defined type is created, and establishes some default state for the other methods.
The validate method returns a boolean indicating whether the message should be sent down to the client, and serialize determines the actual data to send.  A callback can be provided if
the server is requesting data from the client (e.g. updating server state), and would be executed when the client finishes handling the message.

## Client

Tycho provides a simple client-side library for interfacing with a tycho server.  In addition, the server-side messaging interface used by tycho is also available on the client
to provide consistency in message definitions.  All client-side code is purely optional and is provided to simplify getting started with tycho.

## Documentation

Full documentation can be found at: <coming soon>

