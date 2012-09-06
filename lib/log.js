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
	
function log (template, level) {
	if (settings.enabled && level < settings.level) {
		var args = Array.prototype.slice.call(arguments, 2);
		console.log(lib.format(template, { clear: clear, yellow: settings.color ? yellow : clear, red: settings.color ? red : clear, message: args.join(' ') }));
	}
}

module.exports = {
	out: log.bind(this, '{clear}   tycho.log - {message}', 2),
	warn: log.bind(this, '{yellow}   tycho.warning - {clear} {message}', 1),
	error: log.bind(this, '{red}   tycho.error - {clear} {message}', 0),
	settings: settings
};