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
	Dissolve = require('dissolve'),
	when = require('when'),

	util = require('util'),
	EventEmitter = require('events').EventEmitter,

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

	this.endpoints = {};

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
		//Initialize server for host services
		var tcpServer = this.tcpServer = net.createServer(function(sock) {
			// We have a connection. New socket object is assigned to the each service automatically.			
			var endpoint = new ServiceEndpoint(self, sock),
				id = endpoint.getId();
			log.info('New connection', id);
			self.endpoints[id] = endpoint;

			// DEBUG

			var getDevTimer = setInterval(function() {	
				endpoint.getDeviceList()
		    	.then(function(deviceList) {
		    		console.log('Device list', deviceList);
		        });

		    }, 8000);
			
			endpoint.on('onClose', function() {
				clearInterval(getDevTimer);
			});

		});
		tcpServer.listen(self.servicePort, gatewayHost);
		log.info('Listening on ' + gatewayHost +':'+ this.servicePort);
		this.emit('onReady', this);
	}
	catch(err) {
		console.error(err);
	}
}


ServiceGateway.sendUnicast 		= function(addr /* to one */ ) {}
ServiceGateway.sendMulicast 	= function(addrs /* to group */ ) {}
ServiceGateway.sendBroadcast 	= function( /* to all */) {}

// System methods.

//Sync method
ServiceGateway.prototype.getMachineGuid = function() {
	var idpath = '/etc/machine-id';
	var machineId = null;
	try {
	    fs.accessSync(idpath, fs.F_OK);
	    machineId = fs.readFileSync(idpath);
	} catch (e) {
		try {
			var stdout = proc.execSync('systemd-machine-id-setup');
			machineId = fs.readFileSync(idpath);
		}
		catch(e) {
			// Something wrong.
			log.error('getMachineGuid', stdout);
		}
	}
	if(machineId instanceof Buffer) {
		machineId = machineId.toString();
	}
	machineId = machineId.replace(/\r?\n|\r/g, '');
	if(!machineId) {
		log.warn('getMachineGuid', 'MACHINE-ID not found');
		// try to create own machine id
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

function fmtJson(json) {
	return JSON.stringify(json, null, 4);
}

var guidByData = function(data) {
	return aguid(data);
}

module.exports = ServiceGateway;

