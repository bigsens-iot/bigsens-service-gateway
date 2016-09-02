/*
 * Copyright (c) 2016, Bigsens, LLC
 * Root Service includes service management routines, message proxy between
 * internal (Services) and external networks (APIGateway/RemoteServer).
 * Author: Constantin Alexandrov
 *
 *
 * ID       | Endpoint                | Service
 * ---------|-------------------------|----------------------------------
 * f17890b5 | Root Service            | Root Service
 * 328f9daf | WebSocket Proxy         | WebSocket Proxy (v.0.1)
 * 16411f8c | Bigsens User Interface  | Bigsens User Interface (v.0.1)
 * 7cd42c51 | Bigsens ZNP Service     | Bigsens ZNP Service (v.0.1)
 *
 */

'use strict';

var _ = require('underscore'),
	proc = require('child_process'),
	os = require('os'),
	fs = require('fs'),
	net = require('net'),

	aguid = require('aguid'),
	Enum = require('enum'),
	Q = require('q'),
	//Dissolve = require('dissolve'),
	//when = require('when'),

	util = require('util'),
	EventEmitter = require('events').EventEmitter,

	Table = require('cli-table'),

	P = require('./protocol'),
	ServiceEndpoint = require('./ServiceEndpoint'),
	//protoify = require('../protoify/index.js'),
	//ByteBuffer = require('protobufjs').ByteBuffer,

	log4js = global.log4js,
	log = log4js.getLogger('RootService'),
	debug = require('debug')('RootService');


var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);

var gatewayHost = 'localhost';


function RootService(config) {

	this.name = 'Root Service';
	this.version = '0.1';
	this.type = 'gateway',
	this.guid = guidByData(this.name+this.type+this.version),
	this.config = config || {};

	this.gatewayInfo = this.getMachineInfo();

	// Host services with TCP sockets connects to that port
	this.servicePort = this.config.servicePort || 13777;
	this.tcpServer = null;

	this.root = null; // There will be the root endpoint

	/*
	 * Think about bridge between runtime and endpoint. How more native?
	 * When container is started, look on events from daemon. Ok.
	 * What about various interfaces and protocols?
	 * What about interaction direction server<->client?
	 */

	this.endpoints = {}; // key: address, value: service endpoint object

	this.start.bind(this);

}

util.inherits(RootService, EventEmitter);

RootService.prototype.info = function() {	
	return {
		guid : this.guid,
		name : this.name,
		type : this.type,
		version : this.version
	};
}

RootService.prototype.getName = function() {
	return this.name;
}

RootService.prototype.getGuid = function() {
	return this.guid;
}

RootService.prototype.checkStatus = function() {
	var status = 0; // is ok
	// TODO: Add status conditions
	if(!tcpServer) {
		// tcpServer not found
	}
	return status;
}

/*
 * When endpoint is binded the all messages are visible to other endpoints, otherwise
 * messages from the endpoint can't be visible by service gateway and others.
 */
RootService.prototype.bindEndpoint = function(endpoint) {
	// Several instances with the same guid?
	if(endpoint && endpoint.isAlive()) {
		var addr = endpoint.getAddress(),
		prevEp = this.endpoints[addr];
		if(prevEp) {
			if(prevEp.isAlive()) {
				log.warn('Working endpoint for the service %s', ep.getName());
			} else {
				delete this.endpoints[addr];
				this.endpoints[addr] = endpoint;
			}
		} else {
			this.endpoints[addr] = endpoint;
		}
	}
}

RootService.prototype.unbindEndpoint = function(endpoint, withDestroy) {
	if(endpoint) {
		var addr = endpoint.getAddress();
		if(endpoint.isAlive() && withDestroy) {
			// TODO: free sock
		}
		delete this.endpoints[addr];
	}
}

RootService.prototype.getEndpointList = function() {
	var list = [];
	_.forEach(this.endpoints, function(endpoint) {
		list.push(endpoint.getInfo());
	});
	return list;
}

RootService.prototype.getEndpointById = function(id) {
	var found;
	_.forEach(this.endpoints, function(endpoint) {
		if(endpoint.getId() == id) {
			found = endpoint;
		}
	});
	if(!found) {
		log.warn('Service endpoint with id %s not found', id);
	}
	return found;
}

RootService.prototype.getEndpointByAddress = function(addr) {
	return this.endpoints[addr];
}

RootService.prototype.getGatewayInfo = function() {
	return this.gatewayInfo;
}

RootService.prototype.start = function() {
	var self = this;
	log.info('Starting the Root Service...');
	log.info('Service info', fmtJson(this.info()));
	try {
		//Initialize server for internal services
		var tcpServer = this.tcpServer = net.createServer(function(sock) {
			// We have a connection. New socket object is assigned to the each service automatically.			
			var endpoint = new ServiceEndpoint(sock, true), // Direction server->client
				address = endpoint.getAddress();
			log.info('Service endpoint connected with address %s', address);

			// Endpoint binding after service announcement?
			self.bindEndpoint(endpoint);

			// DEBUG

			/*var getDevTimer = setInterval(function() {	
				endpoint.getDeviceList()
		    	.then(function(deviceList) {
		    		console.log('Device list', deviceList);
		        });

		    }, 8000);*/

			endpoint.on('received', self._packetHandler.bind(self));
			endpoint.on('onClose', function(ep) {
				//clearInterval(getDevTimer);
				self.unbindEndpoint(ep);
			});

		});
		tcpServer.listen(self.servicePort, gatewayHost);
		log.info('Listening on ' + gatewayHost +':'+ this.servicePort);

		// Create root service loopback 
		this.loopback();

		this.emit('ready', this);

		// TEST
		/*var endpoint;
		setInterval(function() {
			if(!endpoint) {
			    // Host services ID's
				// 4f8ed72a - Remote Server (WS) service with 1 endpoint
				// 7cd42c51 - ZigBee service with 1 endpoint
				// 936a185c - Echo service with 3 endpoints
				endpoint = self.getEndpointById('4860c175');
			} else {
				if(endpoint.isAlive()) {
					endpoint.getDeviceList().then(function(deviceList) {
						console.log('Device list', deviceList);
					});
				} else {
					endpoint = undefined;
				}
			}
		}, 8000);*/

		setInterval(function() {
			displayEndpoints(self.getEndpointList());
		}, 5000);

	}
	catch(err) {
		console.error(err);
	}
}

/*
 * Root Service allow to work with IMessage (and user defined messages) from any module in
 * the current instance. Root Service loopback is alive during the service instance lifetime.
 */

RootService.prototype.loopback = function() {

	var self = this;
	var sock = net.connect(this.servicePort, function() {

		function info(dir) {
			return {
				name:self.getName()+' '+(dir?'[server]':'[client]'),
				guid:self.getGuid()
			};
		}

		// Direction client->server
		var root = self.root = new ServiceEndpoint(sock, false, self.info()); 

		var address = root.getAddress();
		log.info('Root service client connected', address);

		// Direction server->client
		root.serviceAnnounce(self.info());

		// So, for example we can call methods from all connected
		// services and store responses to the database
		/*setInterval(function() {
			if(root) {
				root.getDeviceList().then(function(deviceList) {
					console.log('Device list', deviceList);
					if(deviceList) {
						// TODO: Store to the database
					}
				});
			}
		}, 5000);*/

		/*setInterval(function() {
			root.sendMessage('USER_MESSAGE', { name : 'Hello world' });
		}, 3000);*/


		// OR listen messages what we are interested e.g. SERVICE_ANNCE from all services/drivers
		root.on('message:SERVICE_ANNCE', function(info) {
			// Do something...
			console.log('SERVICE_ANNCE %j', info);
		});

		root.on('message:GATEWAY_INFO', function() {
			this.sendMessage('GATEWAY_INFO', self.getMachineInfo());
		});

	});

}

// temporary solution
function isMessage(message) {
	var msgarr = [
	    Message.SERVICE_ANNCE,
	    Message.SERVICE_READY,
	    Message.GATEWAY_CONNECT,
	    Message.GATEWAY_DISCONNECT,
	    Message.USER_MESSAGE
	];
	return _.findWhere(msgarr, message.value);
}

// Message handler from all endpoints on the host machine
// Packet already decoded at the Service Endpoint level
// Looks to the src/dst for routing and sync/async for requests
RootService.prototype._packetHandler = function(packet) {

	debug('_packetHandler', packet);

	var self = this,
		src = packet.src,
		dst = packet.dst,
		message = Message.get(packet.cmd);

	if(dst) {
		if(dst instanceof Array) {
			var addrCount = dst.length;
			if(addrCount == 1) {
				// unicast
			} else if(addrCount > 1) {
				// multicast
			} else {
				// broadcast
			}
		}
	}

	// Boys on left, girls on right
	if(isMessage(message)) {
		this.msgcast(message, packet.data, src, dst).then(function(status) {
			// Check status.
		});

	} else {
		if(!packet.async) {
			this.syncast(message, packet.data, src, dst).then(function(bunch) {
				// Do something with bunch
				var srcEp = self.getEndpointByAddress(src);
				if(srcEp) {
					srcEp.sendMessage(message, bunch, true);
				} else {
					log.warn('_packetHandler', 'syncast does not found the source endpoint');
				}
			});
		} else {
			this.asyncast(message, data, src, dst); // All responses returns to the source
		}
	}

}

// for sync methods
RootService.prototype.syncast = function(message, data, src, dst, callback) {

    var self = this,
    	deferred = Q.defer(),
		endpointsReqs = [],
		rspbunch = [],
		srcEp = this.getEndpointByAddress(src);

    debug('%s -> syncast(%s, %j, %s, %s)', srcEp.getName(), message.key, data, src, dst);

	_.forEach(this.endpoints, function(endpoint) {
		// TODO: Build reqs based on the dst information
		if(src != endpoint.getAddress() && endpoint.dir) {
			(function(ep) {
				endpointsReqs.push(function(rspbunch) {
					// Request with skip proxy to _packetHandler
					return ep.syncRequest(message.key, data).then(function(rsp) {				
						/* 
						 * NOTE: Response will be undefined by timeout reject
						 */
						rspbunch.push({
							dst : ep.getAddress(), // Service endpoint address who return response
							data : rsp || null, // Actual response from endpoint
							service : {
								name : ep.getName(), // Service name
								guid : ep.getGuid() // Service guid
							}
						});
						return rspbunch;
					});
				});
			})(endpoint); // Closure for endpoint
		}
	});

	(endpointsReqs.reduce(function(soFar, f) {
		return soFar.then(f);
	}, Q(rspbunch))).then(function(rspbunch) {
		var srcEp = self.getEndpointByAddress(src);
		debug('syncast response %j from %s', rspbunch, srcEp.getName());
		deferred.resolve(rspbunch);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
}

RootService.prototype.asyncast = function(message, data, src, dst) {
	// TODO
}

RootService.prototype.msgcast = function(message, data, src, dst, callback) {

	var self = this,
	deferred = Q.defer(),
	endpointsReqs = [],
	status = 0,
	srcEp = this.getEndpointByAddress(src);

	debug('%s -> msgcast(%s, %j, %s, %s)', srcEp.getName(), message.key, data, src, dst);

	_.forEach(this.endpoints, function(endpoint) {
		if(src != endpoint.getAddress() && endpoint.isAnnounced() && endpoint.dir) {
			(function(ep) {
				endpointsReqs.push(function() {
					return ep.sendMessage(message.key, data, true);
				});
			})(endpoint);
		}
	});

	(endpointsReqs.reduce(function(soFar, f) {
		return soFar.then(f);
	}, Q())).then(function() {
		deferred.resolve(status);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);

}

/*
 * System methods like machine info and system settings need to move to separate module
 */

//Sync method
RootService.prototype.getMachineGuid = function() {
	var idpath = '/etc/machine-id';
	var machineId = null;

	// native: /etc/machine-id
	try {
	    fs.accessSync(idpath, fs.F_OK);
	    machineId = fs.readFileSync(idpath);
	} catch (e) {
		try {
			var stdout = proc.execSync('systemd-machine-id-setup');
			machineId = fs.readFileSync(idpath);
		}
		catch(e) {
			// Something wrong
			log.error('getMachineGuid', stdout);
		}
	}
	if(machineId instanceof Buffer) {
		machineId = machineId.toString();
	}
	machineId = machineId.replace(/\r?\n|\r/g, '');
	if(!machineId) {
		log.warn('getMachineGuid', 'MACHINE-ID not found');
		// synth: try to create own machine id
		// create file /etc/machine-id
		// write random guid
	}
	return aguid(machineId);
}

RootService.prototype.getMachineInfo = function() {

	var meminfo = {
		totalMem : os.totalmem() / (1024*1024),
		freeMem : os.freemem() / (1024*1024),
	};
	meminfo.free = Number(((meminfo.freeMem/meminfo.totalMem)*100).toFixed(2));

	var ifaces = os.networkInterfaces(),
		nwkifaces = {};
	_.each(ifaces, function(iface, ifaceName) {
		if(ifaceName == 'eth0') {
			nwkifaces[ifaceName] = iface;
		}
	});

	var machineInfo = {
		guid 		: this.getMachineGuid(),
		hostname	: os.hostname(),
		meminfo		: meminfo,
		nwkifaces 	: nwkifaces
	};
	return machineInfo;

}

function displayEndpoints(list) {	
	try {
		var table = new Table({
			head: ['Name', 'Address', 'ID', 'Pending'],
			colWidths: [24, 20, 12, 10],
		});
		_.each(list, function(item) {
			table.push([
			     item.name ? item.name : 'undefined',
			     item.address,
			     item.id ? item.id : 'undefined',
			     item.pendingCount
			]);
		});
		console.log(table.toString());
	}
	catch(err) {
		log.error(fmtJson(list));
	}
}

//data packing routines
var _decodeMessage = function(data) {
	return JSON.parse(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

function fmtJson(json) {
	return JSON.stringify(json, null, 2);
}

var guidByData = function(data) {
	return aguid(data);
}

module.exports = RootService;

