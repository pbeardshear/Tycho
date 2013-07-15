// ----------------------------------------------------------------------------
//	Colored logging outputs for tycho!
// ----------------------------------------------------------------------------

var lib = require('./lib'),
	clear = '\u001b[0;37m',
	yellow = '\u001b[1;33m',
	red = '\u001b[1;31m',
	settings = {
		enabled: true,
		color: true,
		level: 3
	};

function log (before, after, level) {
	if (settings.enabled && level < settings.level) {
		var args = Array.prototype.slice.call(arguments, 3),
			colors = {
				clear: clear,
				yellow: settings.color ? yellow : clear,
				red: settings.color ? red : clear
			}
		console.log.apply(console,
			[lib.format(before, colors)]
				.concat(args)
				.concat(lib.format(after, colors)));
	}
}

module.exports = {
	out: log.bind(this, '{clear}   tycho.log -', '', 2),
	warn: log.bind(this, '{yellow}   tycho.warning -', '{clear}\n', 1),
	error: log.bind(this, '{red}   tycho.error -', '{clear}\n', 0),
	settings: settings
};