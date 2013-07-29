var assert = require('assert');

// Test file
var Store = require('../lib/store');

describe('Store', function () {
	var defaultPort = 6379,
		defaultChannel = 1,
		store;

	before(function () {
		store = new Store(defaultChannel, defaultPort);
	});

	describe('#storage()', function () {
		// store.set, store.get
		it('should store and retrieve a simple key-value pair', function (done) {
			store.set('hash', 'key', 'value', function (err) {
				assert.ifError(err);
				store.get('hash', 'key', function (err, val) {
					assert.ifError(err);
					assert.equal(val, 'value');
					done();
				});
			});
		});

		// store.mset, store.mget
		it('should store and retrieve a javascript object', function (done) {
			var obj = { a: 1, b: 'string', c: 5 };
			store.mset('ohash', obj, function (err) {
				assert.ifError(err);
				store.mget('ohash', function (err, val) {
					assert.ifError(err);
					assert.deepEqual(val, obj);
					done();
				});
			});
		});

		// store.del
		it('should support deleting keys', function (done) {
			store.set('hash', 'dkey', 'dvalue', function (err) {
				assert.ifError(err);
				store.del('hash', 'dkey', function (err) {
					assert.ifError(err);
					store.get('hash', 'dkey', function (err, val) {
						assert.strictEqual(val, null);
						done();
					});
				})
			});
		});

		// store.multi
		it('should support queued commands in a transaction', function () {
			store.multi()
				.hset('hash', 'mkey1', 'mvalue1')
				.hset('hash', 'mkey2', 'mvalue2')
				.exec(function (err) {
					assert.ifError(err);
					store.multi()
						.hget('hash', 'mkey1')
						.hget('hash', 'mkey2')
						.exec(function (err, replies) {
							assert.equal(replies[0], 'mvalue1');
							assert.equal(replies[1], 'mvalue2');
						});
				});
		});
	});

	describe('#send()', function () {
		it('should send directed messages to a single channel', function (done) {
			var sender = new Store(2, defaultPort),
				receiver = new Store(3, defaultPort),
				eventType = 'ping',
				eventMessage = 'hello world!';

			receiver.on('message', function (type, message, src) {
				assert.equal(type, eventType);
				assert.equal(message, eventMessage);
				assert.equal(src, sender.processID);
				sender.close();
				receiver.close();
				done();
			});

			receiver.on('subscribe', function () {
				sender.send(eventType, receiver.processID, eventMessage);
			});
		});

		it('should send messages with array payloads', function (done) {
			var sender = new Store(2000, defaultPort),
				receiver = new Store(3000, defaultPort),
				eventType = 'arrayMsg',
				eventMessage = ['some', 'data', 'in', 'this', 'array'];

			receiver.on('message', function (type, message, src) {
				assert.deepEqual(message, eventMessage);
				assert.equal(src, sender.processID);
				sender.close();
				receiver.close();
				done();
			});

			receiver.on('subscribe', function () {
				sender.send(eventType, receiver.processID, eventMessage);
			});
		});

		it('should send messages with object payloads', function (done) {
			var sender = new Store(2000, defaultPort),
				receiver = new Store(3000, defaultPort),
				eventType = 'rise robot rise',
				eventMessage = { devilsHands: 'idle playthings', route: 'all evil' };

			receiver.on('message', function (type, message, src) {
				assert.deepEqual(message, eventMessage);
				assert.equal(src, sender.processID);
				sender.close();
				receiver.close();
				done();
			});

			receiver.on('subscribe', function () {
				sender.send(eventType, receiver.processID, eventMessage);
			});
		});
	});

	describe('#broadcast()', function () {
		it('should support broadcasting to multiple clients', function (done) {
			var sender = new Store(4, defaultPort),
				receiver1 = new Store(5, defaultPort, ['broadcast']),
				receiver2 = new Store(6, defaultPort, ['broadcast']),
				receiver3 = new Store(7, defaultPort, ['broadcast']),
				eventType = 'good morning',
				eventMessage = 'wake up mr. west!',
				received = {},
				subscribed = {};

			function handler(name, type, message, src) {
				assert.equal(type, eventType);
				assert.equal(message, eventMessage);
				assert.equal(src, sender.processID);
				received[name] = 1;
				if (Object.keys(received).length === 3) {
					done();
				}
			}

			function subHandler(name) {
				subscribed[name] = 1;
				if (Object.keys(subscribed).length === 3) {
					sender.broadcast(eventType, eventMessage);
				}
			}

			receiver1.on('message', handler.bind(this, 'red1'));
			receiver2.on('message', handler.bind(this, 'red2'));
			receiver3.on('message', handler.bind(this, 'red3'));

			receiver1.on('subscribe', subHandler.bind(this, 'red1'));
			receiver2.on('subscribe', subHandler.bind(this, 'red2'));
			receiver3.on('subscribe', subHandler.bind(this, 'red3'));
		});
	});

	after(function (done) {
		store.commands().flushdb(function () {
			store.close();
			done();
		});
	});
});