/*
 * Copyright (c) 2016, Bigsens, LLC
 * 
 * Core Service Gateway (CSG)
 * 
 * The main idea is to build edge computing platform based on compute instances,
 * microservices and application framework. Platform includes several abstraction layers.
 * It's important to know what all the layers are located in the edge machine,
 * eg. Raspberry Pi, BeagleBone and others single board computers with the hub function.
 * Communication between edge machines builds/run on the top of that platform.
 *
 * Basic layers are:
 *   1. Infrastructure layer, instances management, deploy/update, health check, etc.
 *   2. Microservices layer, endpoints, message API on the TCP protocol.
 *   3. Application framework layer, user interface, ready to use stacks.
 *   
 * Included subsystems:
 * 	 1. Core
 *   2. Runtime - implementation with Container Runtime, look at the RunC
 *   3. Deploy - '$ git push' deploy to SBC
 *   4. Service - microservices management based on the Runtime subsystem
 *   5. API Gateway - WebSocket, REST
 * 
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

