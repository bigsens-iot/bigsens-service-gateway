/*
 * Copyright (c) 2016, Bigsens, LLC
 * Service Gateway includes service management routines, message proxy between
 * internal (Services) and external networks (APIGateway/RemoteServer).
 * Author: Constantin Alexandrov
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
	log = log4js.getLogger('ServiceGateway'),
	debug = require('debug')('ServiceGateway');


var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);

var gatewayHost = 'localhost';


function ServiceGateway(config) {

	this.name = 'Service Gateway';
	this.version = '0.1';
	this.type = 'gateway',
	this.guid = guidByData(this.name+this.type+this.version),
	this.config = config || {};

	this.gatewayInfo = this.getMachineInfo();

	// Host services with TCP sockets connects to that port
	this.servicePort = this.config.servicePort || 13777;
	this.tcpServer = null;

	this.remoteService = null;

	/*
	 * Think about bridge between runtime and endpoint. How more native?
	 * When container is started, look on events from daemon. Ok.
	 * What about various interfaces and protocols?
	 * What about interaction direction server<->client?
	 */

	this.endpoints = {}; // key: address, value: service endpoint object

	this.start.bind(this);

}

util.inherits(ServiceGateway, EventEmitter);

ServiceGateway.prototype.info = function() {	
	return {
		guid : this.guid,
		name : this.name,
		type : this.type,
		version : this.version
	};
}

/*
 * When endpoint is binded the all messages are visible to other endpoints, otherwise
 * messages from the endpoint can't be visible by service gateway and others.
 */
ServiceGateway.prototype.bindEndpoint = function(endpoint) {
	// Several instances with the same guid?
	if(endpoint && endpoint.isAlive()) {
		var addr = endpoint.getAddress(),
		prevEp = this.endpoints[addr];
		if(prevEp) {
			if(prevEp.isAlive()) {
				log.warn('Working endpoint for the service with name %s', ep.getName());
			} else {
				delete this.endpoints[addr];
				this.endpoints[addr] = endpoint;
			}
		} else {
			this.endpoints[addr] = endpoint;
		}
	}
}

ServiceGateway.prototype.unbindEndpoint = function(endpoint, withDestroy) {
	if(endpoint) {
		var addr = endpoint.getAddress();
		if(endpoint.isAlive() && withDestroy) {
			// TODO: free sock
		}
		delete this.endpoints[addr];
	}
}

ServiceGateway.prototype.getEndpointList = function() {
	var list = [];
	_.forEach(this.endpoints, function(endpoint) {
		list.push(endpoint.getInfo());
	});
	return list;
}

ServiceGateway.prototype.getEndpointById = function(id) {
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

ServiceGateway.prototype.getEndpointByAddress = function(addr) {
	return this.endpoints[addr];
}

// Horrible hack, just remake it.
ServiceGateway.prototype.attachProxy = function(proxy) {
	var self = this;
	this.remoteService = proxy;
	this.remoteService.on('onMessage', function(msg) {
		self.send(msg);
	});
	this.sendMessage(Message.GATEWAY_INFO, this.getGatewayInfo());
}

ServiceGateway.prototype.getGatewayInfo = function() {
	return this.gatewayInfo;
}

ServiceGateway.prototype.start = function() {
	var self = this;
	log.info('Starting the service gateway...');
	log.info('Service info', JSON.stringify(this.info(), null, 4));
	try {
		//Initialize server for internal services
		var tcpServer = this.tcpServer = net.createServer(function(sock) {
			// We have a connection. New socket object is assigned to the each service automatically.			
			var endpoint = new ServiceEndpoint(sock),
				addr = endpoint.getAddress();
			log.info('New connection', addr);
			self.bindEndpoint(endpoint);

			// DEBUG

			/*var getDevTimer = setInterval(function() {	
				endpoint.getDeviceList()
		    	.then(function(deviceList) {
		    		console.log('Device list', deviceList);
		        });

		    }, 8000);*/

			endpoint.on('onReceive', self._packetHandler.bind(self));
			endpoint.on('onClose', function(ep) {
				//clearInterval(getDevTimer);
				self.unbindEndpoint(ep);
			});

		});
		tcpServer.listen(self.servicePort, gatewayHost);
		log.info('Listening on ' + gatewayHost +':'+ this.servicePort);

		this.createRootService();

		this.emit('onReady', this);

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
 * Root Service allow to work with IMessages (and user defined messages) in the current instance
 * Service Gateway (ID = 4860c175) <-- pipe --> Root Service (ID = 992fe260)
 */

ServiceGateway.prototype.createRootService = function() {
	var self = this,
		sock = net.connect(this.servicePort, function() {
			var packet = {cmd:Message['SERVICE_ANNCE'].value,data:self.info()};
			packet = JSON.stringify(packet);
			sock.write(packet);
	});

	// Create 'Root Service' endpoint.
	var endpoint = new ServiceEndpoint(sock),
	addr = endpoint.getAddress();
	log.info('Root Service connected', addr);

	// Bind 'Root Service' endpoint, but we skip this from any *cast(...) calls
	this.bindEndpoint(endpoint);

	// For example we can call methods from all connected
	// services and store responses to the database
	setInterval(function() {

		endpoint.getDeviceList().then(function(deviceList) {
			console.log('Device list', deviceList);
			if(deviceList) {
				// TODO: Store to the database
			}
		});

	}, 8000);

	// OR listen messages what we are interested e.g. DEVICE_STATE from all services/drivers
	endpoint.on('message:DEVICE_STATE', function(deviceState) {
		// Do something...
	});

}

// Message handler from all endpoints on the host machine
// Packet already decoded at the Service Endpoint level
// Looks to the src/dst for routing and sync/async for requests
ServiceGateway.prototype._packetHandler = function(packet) {

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

	if(!packet.async) {
		this.syncast(message, packet.data, src, dst).then(function(bunch) {
			var srcEp = self.getEndpointByAddress(src);
			if(srcEp) {
				debug('syncast', 'source =', srcEp.getName(), 'response =', bunch);
				srcEp.sendMessage(message, bunch);
			} else {
				log.warn('_packetHandler', 'syncast does not found the source endpoint');
			}
		});
	} else {
		this.asyncast(message, src, dst); // All responses returns to the source
	}
}

// for sync methods
ServiceGateway.prototype.syncast = function(message, data, src, dst, callback) {

    var deferred = Q.defer(),
		endpointsReqs = [],
		rspbunch = [];

	_.forEach(this.endpoints, function(endpoint) {
		// TODO: Build reqs based on the dst information
		if(src != endpoint.getAddress() && endpoint.isRemote) {
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
		deferred.resolve(rspbunch);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
}

ServiceGateway.prototype.asyncast = function(message, data, dst) {
	// TODO
}

/*
 * System methods like machine info and system settings need to move to separate module
 */

//Sync method
ServiceGateway.prototype.getMachineGuid = function() {
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

ServiceGateway.prototype.getMachineInfo = function() {

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
	var table = new Table({
		head: ['Name', 'Address', 'ID', 'Pending'],
		colWidths: [24, 20, 12, 10],
	});
	_.each(list, function(item) {
		table.push([
		     item.name,
		     item.address,
		     item.id,
		     item.pendingCount
		]);
	});
	console.log(table.toString());
}

//data packing routines
var _decodeMessage = function(data) {
	return JSON.parse(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

function fmtJson(json) {
	return JSON.stringify(json, null, 4);
}

var guidByData = function(data) {
	return aguid(data);
}

module.exports = ServiceGateway;

