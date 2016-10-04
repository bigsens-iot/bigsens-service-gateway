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

var _ = require('underscore'),
	proc = require('child_process'),
	os = require('os'),
	fs = require('fs'),
	log4js = require('log4js'),
	aguid = require('aguid'),
	P = require('./lib/common/protocol');

log4js.configure({
	appenders : [{
		type : 'console'
    }, {
    	type : 'file', // 'dateFile',
    	filename : (process.platform == 'linux' ? '/var/log/bigsens/' : '') + 'bs-core.log',
    	pattern : '-yyyy-MM-dd',
    	alwaysIncludePattern : false
    }],
    replaceConsole : false
});

// Make it global
global.log4js = log4js;
global.P = P;
//global.RuntimeManager = RuntimeManager;
//global.Route = Route;

var RootService = require('./lib/services/root-service/RootService.js'),
	Condition = require('./lib/services/root-service/Condition.js');
	RemoteConnect = require('./lib/tools/RemoteConnect.js');

var log = log4js.getLogger('bscore');

function fmtJson(json) {
	return JSON.stringify(json, null, 2);
}

var main = function() {

	try {

		//var condition = new Condition(['&&', '==', 'armMode', 0x01, 'Alarm1' ]);
		//var ret = condition.process({ 'Alarm1' : true, 'armMode' : 0x01 });

		//console.log(ret);

		// Initialize Root Service on port 13777
		var rootService = new RootService();
		rootService.on('ready', function(root) {

			log.info('Root Service is ready');

			// Add connection to the remote server
			var remote = new RemoteConnect({
				parentService : rootService,
				serverAddress : 'cp.security4home.bigsens.com/zigbee-service-v0/ws/' // In production point to the http://api.bigsens.com
				//serverAddress : 'localhost',
				//serverPort : 8080
			});

			remote.on('ready', function(ep) {
				log.info('Remote connection is ready');
				// test remote

				/*setInterval(function() {
					if(ep) {
						ep.getDeviceList().then(function(deviceList) {
							console.log('Device list', fmtJson(deviceList));
							if(deviceList) {
								// TODO: Store to the database
							}
						});

						// Root - 17acd140-ca09-4c73-8c30-a962db066b05
						// Zigbee - d59ac233-14b6-4c48-8dfc-4bbc383c6a39

						var updinfo = {
							guid : 'd59ac233-14b6-4c48-8dfc-4bbc383c6a39',
							forceRestart : false
						}

						ep.syncRequest('SERVICE_UPDATE', updinfo).then(function(rsp) {
							console.log('Update response =', rsp);
						});

					}
				}, 20000);*/
			});

			remote.start(); // Start the remote server connection

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

