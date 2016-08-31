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
	//RemoteServer = require('./lib/root-service/RemoteServer.js');

var log = log4js.getLogger('BSCore');

var main = function() {

	try {
		// Initialize Root Service on port 13777
		var rootService = new RootService();
		rootService.on('onReady', function(root) {

			log.info('Root Service is ready');

			// Initialize proxy to remote server
			/*var remote = new RemoteServer({
				address : 'localhost', // In production point to the http://api.bigsens.com
				port : 8080
			});
			remote.on('onReady', function() {
				log.info('Connected to the remote server');
				rootService.attachProxy(remote);
			});
			remote.start();*/

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

