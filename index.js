// type Process = Stream → Stream
// type Command = Args → Process
var cp = require('child_process');
var σ  = require('highland');
var fs = require('fs');
var path = require('path');

var pjoin = σ.ncurry(2, path.join);

var exists = σ.wrapCallback(function(path, cb) {
	fs.exists(path, σ.partial(cb, null));
});

var readdir = σ.wrapCallback(function(dir, cb) {
	fs.readdir(dir, function(e, r) {
		cb(e, r.map(pjoin(dir)));
	});
});

// formatArgs :: Args → [String]
function formatArgs(args) {
	return args;
}

// wrapExecutable ::  Path → Command
function wrapExecutable(path) {
	return function(args) {
		return function(stdin) {
			var sub = cp.spawn(path, formatArgs(args));
			setImmediate(function() {
				stdin.pipe(sub.stdin);
			});
			return sub.stdout;
		}
	}
}

var pathExecutables = function(p) {
	return σ(p).flatFilter(exists).map(readdir).flatten();
}

var wrapAll = σ.reduce({}, function(obj, ex) {
	var base = path.basename(ex);
	obj[base] = wrapExecutable(ex);
	return obj;
});

wrapAll(pathExecutables(process.env.PATH.split(':')))
.apply(function(a) {
	a.ls([])(σ([])).pipe(process.stdout);
});

