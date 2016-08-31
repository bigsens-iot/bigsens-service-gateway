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
 *   # User Applications layer, system shell, base gui, device manager, etc.
 *   # Application Framework layer, user interface, ready to use stacks.
 *   # Microservices layer, endpoints, message API on the TCP protocol.
 *   # Infrastructure layer, instances management, deploy/update, health check, etc.
 *
 * Included subsystems (under development):
 *   1. Core
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
		type : 'console'
    }/*, {
    	type : 'file', // 'dateFile',
    	filename : (process.platform == 'linux' ? '/var/log/bigsens/' : '') + 'bscore.log',
    	pattern : '-yyyy-MM-dd',
    	alwaysIncludePattern : false
    }*/],
    replaceConsole : false
});

// Make it global
global.log4js = log4js;
//global.RuntimeManager = RuntimeManager;
//global.Route = Route;

var RootService = require('./lib/root-service/RootService.js');
	WebSocketProxy = require('./lib/root-service/WebSocketProxy.js');

var log = log4js.getLogger('BSCore');

var main = function() {

	try {
		// Initialize Root Service on port 13777
		var rootService = new RootService();
		rootService.on('ready', function(root) {

			log.info('Root Service is ready');

			// Initialize proxy as internal service
			var wsproxy = new WebSocketProxy({
				parentService : rootService,
				targetAddress : 'localhost', // In production point to the http://api.bigsens.com
				targetPort : 8080
			});

			wsproxy.on('ready', function() {
				log.info('WebSocket Proxy is ready');
			});

			wsproxy.start(); // Start the proxy

		});

		rootService.start();

	}
	catch(err) {
		log.error(err);
	}
}

/*
 * Start the system
 */

main();

