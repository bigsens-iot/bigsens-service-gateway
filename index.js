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
	aguid = require('aguid'),
	RuntimeManager = require('./lib/runtime/RuntimeManager.js'),
	Route = require('./lib/runtime/docker/Route.js'),
	ServiceGateway = require('./lib/cgs/ServiceGateway.js'),
	RemoteService = require('./lib/cgs/RemoteService.js');

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
global.RuntimeManager = RuntimeManager;
global.Route = Route;

var log = log4js.getLogger('BS_Core');

var main = function() {

	try {
		// Initialize internal service gateway on port 13777
		var serviceGateway = new ServiceGateway();
		serviceGateway.on('onReady', function(gw) {
			console.log('Service gateway ready');
			// Initialize service gateway on port 8080
			var remote = new RemoteService({
				address : 'localhost', // in production point to http://api.bigsens.com
				port : 8080
			});
			remote.on('onReady', function() {
				console.log('Remote service connected');
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

