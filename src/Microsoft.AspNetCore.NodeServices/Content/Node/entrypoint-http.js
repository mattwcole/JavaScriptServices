(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	// Limit dependencies to core Node modules. This means the code in this file has to be very low-level and unattractive,
	// but simplifies things for the consumer of this module.
	__webpack_require__(2);
	var http = __webpack_require__(3);
	var path = __webpack_require__(4);
	var ArgsUtil_1 = __webpack_require__(5);
	var ExitWhenParentExits_1 = __webpack_require__(6);
	// Webpack doesn't support dynamic requires for files not present at compile time, so grab a direct
	// reference to Node's runtime 'require' function.
	var dynamicRequire = eval('require');
	var server = http.createServer(function (req, res) {
	    readRequestBodyAsJson(req, function (bodyJson) {
	        var hasSentResult = false;
	        var callback = function (errorValue, successValue) {
	            if (!hasSentResult) {
	                hasSentResult = true;
	                if (errorValue) {
	                    respondWithError(res, errorValue);
	                }
	                else if (typeof successValue !== 'string') {
	                    // Arbitrary object/number/etc - JSON-serialize it
	                    var successValueJson = void 0;
	                    try {
	                        successValueJson = JSON.stringify(successValue);
	                    }
	                    catch (ex) {
	                        // JSON serialization error - pass it back to .NET
	                        respondWithError(res, ex);
	                        return;
	                    }
	                    res.setHeader('Content-Type', 'application/json');
	                    res.end(successValueJson);
	                }
	                else {
	                    // String - can bypass JSON-serialization altogether
	                    res.setHeader('Content-Type', 'text/plain');
	                    res.end(successValue);
	                }
	            }
	        };
	        // Support streamed responses
	        Object.defineProperty(callback, 'stream', {
	            enumerable: true,
	            get: function () {
	                if (!hasSentResult) {
	                    hasSentResult = true;
	                    res.setHeader('Content-Type', 'application/octet-stream');
	                }
	                return res;
	            }
	        });
	        try {
	            var resolvedPath = path.resolve(process.cwd(), bodyJson.moduleName);
	            var invokedModule = dynamicRequire(resolvedPath);
	            var func = bodyJson.exportedFunctionName ? invokedModule[bodyJson.exportedFunctionName] : invokedModule;
	            if (!func) {
	                throw new Error('The module "' + resolvedPath + '" has no export named "' + bodyJson.exportedFunctionName + '"');
	            }
	            func.apply(null, [callback].concat(bodyJson.args));
	        }
	        catch (synchronousException) {
	            callback(synchronousException, null);
	        }
	    });
	});
	var parsedArgs = ArgsUtil_1.parseArgs(process.argv);
	var requestedPortOrZero = parsedArgs.port || 0; // 0 means 'let the OS decide'
	server.listen(requestedPortOrZero, 'localhost', function () {
	    // Signal to HttpNodeHost which port it should make its HTTP connections on
	    console.log('[Microsoft.AspNetCore.NodeServices.HttpNodeHost:Listening on port ' + server.address().port + '\]');
	    // Signal to the NodeServices base class that we're ready to accept invocations
	    console.log('[Microsoft.AspNetCore.NodeServices:Listening]');
	});
	ExitWhenParentExits_1.exitWhenParentExits(parseInt(parsedArgs.parentPid));
	function readRequestBodyAsJson(request, callback) {
	    var requestBodyAsString = '';
	    request
	        .on('data', function (chunk) { requestBodyAsString += chunk; })
	        .on('end', function () { callback(JSON.parse(requestBodyAsString)); });
	}
	function respondWithError(res, errorValue) {
	    res.statusCode = 500;
	    res.end(errorValue.stack || errorValue.toString());
	}


/***/ },
/* 2 */
/***/ function(module, exports) {

	// When Node writes to stdout/strerr, we capture that and convert the lines into calls on the
	// active .NET ILogger. But by default, stdout/stderr don't have any way of distinguishing
	// linebreaks inside log messages from the linebreaks that delimit separate log messages,
	// so multiline strings will end up being written to the ILogger as multiple independent
	// log messages. This makes them very hard to make sense of, especially when they represent
	// something like stack traces.
	//
	// To fix this, we intercept stdout/stderr writes, and replace internal linebreaks with a
	// marker token. When .NET receives the lines, it converts the marker tokens back to regular
	// linebreaks within the logged messages.
	//
	// Note that it's better to do the interception at the stdout/stderr level, rather than at
	// the console.log/console.error (etc.) level, because this takes place after any native
	// message formatting has taken place (e.g., inserting values for % placeholders).
	var findInternalNewlinesRegex = /\n(?!$)/g;
	var encodedNewline = '__ns_newline__';
	encodeNewlinesWrittenToStream(process.stdout);
	encodeNewlinesWrittenToStream(process.stderr);
	function encodeNewlinesWrittenToStream(outputStream) {
	    var origWriteFunction = outputStream.write;
	    outputStream.write = function (value) {
	        // Only interfere with the write if it's definitely a string
	        if (typeof value === 'string') {
	            var argsClone = Array.prototype.slice.call(arguments, 0);
	            argsClone[0] = encodeNewlinesInString(value);
	            origWriteFunction.apply(this, argsClone);
	        }
	        else {
	            origWriteFunction.apply(this, arguments);
	        }
	    };
	}
	function encodeNewlinesInString(str) {
	    return str.replace(findInternalNewlinesRegex, encodedNewline);
	}


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("http");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 5 */
/***/ function(module, exports) {

	"use strict";
	function parseArgs(args) {
	    // Very simplistic parsing which is sufficient for the cases needed. We don't want to bring in any external
	    // dependencies (such as an args-parsing library) to this file.
	    var result = {};
	    var currentKey = null;
	    args.forEach(function (arg) {
	        if (arg.indexOf('--') === 0) {
	            var argName = arg.substring(2);
	            result[argName] = undefined;
	            currentKey = argName;
	        }
	        else if (currentKey) {
	            result[currentKey] = arg;
	            currentKey = null;
	        }
	    });
	    return result;
	}
	exports.parseArgs = parseArgs;


/***/ },
/* 6 */
/***/ function(module, exports) {

	/*
	In general, we want the Node child processes to be terminated as soon as the parent .NET processes exit,
	because we have no further use for them. If the .NET process shuts down gracefully, it will run its
	finalizers, one of which (in OutOfProcessNodeInstance.cs) will kill its associated Node process immediately.

	But if the .NET process is terminated forcefully (e.g., on Linux/OSX with 'kill -9'), then it won't have
	any opportunity to shut down its child processes, and by default they will keep running. In this case, it's
	up to the child process to detect this has happened and terminate itself.

	There are many possible approaches to detecting when a parent process has exited, most of which behave
	differently between Windows and Linux/OS X:

	 - On Windows, the parent process can mark its child as being a 'job' that should auto-terminate when
	   the parent does (http://stackoverflow.com/a/4657392). Not cross-platform.
	 - The child Node process can get a callback when the parent disconnects (process.on('disconnect', ...)).
	   But despite http://stackoverflow.com/a/16487966, no callback fires in any case I've tested (Windows / OS X).
	 - The child Node process can get a callback when its stdin/stdout are disconnected, as described at
	   http://stackoverflow.com/a/15693934. This works well on OS X, but calling stdout.resume() on Windows
	   causes the process to terminate prematurely.
	 - I don't know why, but on Windows, it's enough to invoke process.stdin.resume(). For some reason this causes
	   the child Node process to exit as soon as the parent one does, but I don't see this documented anywhere.
	 - You can poll to see if the parent process, or your stdin/stdout connection to it, is gone
	   - You can directly pass a parent process PID to the child, and then have the child poll to see if it's
	     still running (e.g., using process.kill(pid, 0), which doesn't kill it but just tests whether it exists,
	     as per https://nodejs.org/api/process.html#process_process_kill_pid_signal)
	   - Or, on each poll, you can try writing to process.stdout. If the parent has died, then this will throw.
	     However I don't see this documented anywhere. It would be nice if you could just poll for whether or not
	     process.stdout is still connected (without actually writing to it) but I haven't found any property whose
	     value changes until you actually try to write to it.

	Of these, the only cross-platform approach that is actually documented as a valid strategy is simply polling
	to check whether the parent PID is still running. So that's what we do here.
	*/
	"use strict";
	var pollIntervalMs = 1000;
	function exitWhenParentExits(parentPid) {
	    setInterval(function () {
	        if (!processExists(parentPid)) {
	            // Can't log anything at this point, because out stdout was connected to the parent,
	            // but the parent is gone.
	            process.exit();
	        }
	    }, pollIntervalMs);
	}
	exports.exitWhenParentExits = exitWhenParentExits;
	function processExists(pid) {
	    try {
	        // Sending signal 0 - on all platforms - tests whether the process exists. As long as it doesn't
	        // throw, that means it does exist.
	        process.kill(pid, 0);
	        return true;
	    }
	    catch (ex) {
	        // If the reason for the error is that we don't have permission to ask about this process,
	        // report that as a separate problem.
	        if (ex.code === 'EPERM') {
	            throw new Error("Attempted to check whether process " + pid + " was running, but got a permissions error.");
	        }
	        return false;
	    }
	}


/***/ }
/******/ ])));