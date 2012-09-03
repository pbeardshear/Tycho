// ----------------------------------------------------------------------------
//	Colored logging outputs for tycho!
// ----------------------------------------------------------------------------

var lib = require('./lib'),
	clear = '\u001b[0;37m',
	yellow = '\u001b[1;33m',
	red = '\u001b[1;31m';
	
function log (template) {
	var args = Array.prototype.slice.call(arguments, 1);
	console.log(lib.format(template, { clear: clear, yellow: yellow, red: red, message: args.join(' ') }));
}

module.exports = {
	out: log.bind(this, '{clear}   tycho.log - {message}'),
	warn: log.bind(this, '{yellow}   tycho.warning - {clear} {message}'),
	error: log.bind(this, '{red}   tycho.error - {clear} {message}')
};