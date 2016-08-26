/*
 * Copyright (c) 2016, Bigsens, LLC
 * Core Gateway Service (CGS) - common management operations with connected services
 * and API Gateway. Included subsystems:
 * @ Runtime - implementation with Container Runtime, look at the RunC
 * @ Deploy - '$ git push' deploy to SBC
 * @ Service - microservice management based on Runtime subsystem
 * @ API Gateway - WebSocket, REST
 * Author: Constantin Alexandrov
 */

var proc = require('child_process'),
	os = require('os'),
	fs = require('fs'),
	log4js = require('log4js'),
	aguid = require('aguid');

log4js.configure({
	appenders : [{
		type : "console"
    }, {
    	"type" : "dateFile",
        "filename" : (process.platform == 'linux' ? '/var/log/bigsens/' : '') + 'bs-core.log',
        "pattern" : "-yyyy-MM-dd",
        "alwaysIncludePattern" : false
    }],
    replaceConsole : false
});

// make it global
global.log4js = log4js;
//global.RuntimeManager = RuntimeManager;
//global.Route = Route;

var //RuntimeManager = require('./lib/runtime/RuntimeManager.js'),
	//Route = require('./lib/runtime/docker/Route.js'),
	ServiceGateway = require('./lib/cgs/ServiceGateway.js'),
	RemoteServer = require('./lib/cgs/RemoteServer.js');

var log = log4js.getLogger('BS_Core');

var main = function() {

	try {
		// Initialize internal service gateway on port 13777
		var serviceGateway = new ServiceGateway();
		serviceGateway.on('onReady', function(gw) {
			console.log('Service gateway ready');
			// Initialize service gateway on port 8080
			var remote = new RemoteServer({
				address : 'localhost', // in production point to the http://api.bigsens.com
				port : 8080
			});
			remote.on('onReady', function() {
				console.log('Connected to remote server');
				serviceGateway.attachProxy(remote);
			});
			remote.start();
		});
		serviceGateway.start();
	}
	catch(err) {
		log.error(err);
	}
}

/*
 * Start the service.
 */

main();

