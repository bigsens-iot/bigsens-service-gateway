/*
 * Copyright (c) 2016, Bigsens, LLC
 * Author: Constantin Alexandrov
 */

'use strict';

var net = require('net'),
	Enum = require('enum'),
	util = require('util'),
	Stream = require('stream'),
	//Message = require('./protocol').Message,
	Message = global.P.Message,
	ServiceEndpoint = require('./ServiceEndpoint'),
	WebSocket = require('ws'),
	log4js = global.log4js,
	log = log4js.getLogger('WebSocketProxy'),
	debug = require('debug')('WebSocketProxy'),
	aguid = require('aguid');

var Message = new Enum(Message);

var targetAddress = 'localhost';
var targetPort = 8080;

var defaultServicePort = 13777;


function Flag() { this.MAX_FLAG_VALUE = 65535; this.flag = null; }
Flag.prototype.set = function(flag) { this.flag = flag; };
Flag.prototype.get = function() { return this.flag; };
Flag.prototype.add = function(flag) { this.flag |= flag; };
Flag.prototype.sub = function(flag) { this.flag &= (this.MAX_FLAG_VALUE - flag); };
Flag.prototype.check = function(flag) { return !!(this.flag & flag); };
Flag.prototype.clear = function() { this.Set(0); };

// Proxy flags
function ProxyStatus() {}
ProxyStatus.NOT_LINKED = 0x00;
ProxyStatus.SOURCE_CONNECTED = 0x01;
ProxyStatus.TARGET_CONNECTED = 0x02;

util.inherits(ProxyStatus, Flag);

var gatewayHost = 'localhost';

function WebSocketProxy(config) {

	this.name = 'WebSocket Proxy';
	this.version = '0.1';
	this.type = 'proxy';
	this.guid = guidByData(this.name+this.type+this.version),
	this.config = config || {};

	this.parentService = this.config.parentService || null;
	if(this.parentService) {
		this.guid = this.parentService.getGuid();
		this.sourceAddress = gatewayHost;
	}
	this.sourcePort = this.parentService ? this.parentService.servicePort : defaultServicePort;
	this.sourceSock;
	this.srcep;

	this.targetAddress = this.config.targetAddress || targetAddress;
	this.targetPort = this.config.targetPort;
	this.targetSock;

	this.proxyStatus = new ProxyStatus();

	this._errcount = 0;
	this.retryTimer = null;
	this.retryInterval = 10000;

	//this.start.bind(this);

	try {
		var sock = this.sourceSock = net.connect(this.sourcePort, function() {
			WebSocketProxy.super_.call(this, sock, false, this.info());
			var address = this.getAddress();
			log.info('Proxy source endpoint connected %s', address);
			this.serviceAnnounce(this.info());
			this.proxyStatus.add(ProxyStatus.SOURCE_CONNECTED);
			this.start.bind(this);
		}.bind(this));
	}
	catch(err) {
		this.proxyStatus.sub(ProxyStatus.SOURCE_CONNECTED);
		log.error('Create the source', err);
		if(this.parentService) {
			var status = this.parentService.checkStatus();
			if(status != 0) {
				log.error('Parent service error');
			}
		}
	}

}

util.inherits(WebSocketProxy, ServiceEndpoint);

WebSocketProxy.prototype.info = function() {	
	return {
		guid : this.guid,
		name : this.name,
		type : this.type,
		version : this.version
	};
}

WebSocketProxy.prototype.getName = function() {
	return this.name;
}

WebSocketProxy.prototype.getGuid = function() {
	return this.guid;
}

WebSocketProxy.prototype.getEndpoint = function() {
	return this.srcep;
}

/*
 * Handlers
 */
//WebSocketProxy.prototype.end = function() {}
//WebSocketProxy.prototype.write = function() {}

WebSocketProxy.prototype._sourceReceived = function(data, flags) {}
WebSocketProxy.prototype._sourceError = function(err) {
	log.error('Source sock error', err);
	this.closeSource(err);
	// Try to restart
}
WebSocketProxy.prototype._sourceClosed = function() {
	log.info('Source %j closed', this.info());
}

WebSocketProxy.prototype._targetReceived = function(data, flags) {}
WebSocketProxy.prototype._targetError = function(err) {
	log.error('Target socket error', err);
	this._errcount++;
}
WebSocketProxy.prototype._targetClosed = function() { // When error too
	log.info('Connection to target address %s closed', this.targetAddress+':'+this.targetPort);
	this.closeTarget();
	this._retryTarget();
}

/*
 * Channels
 */

WebSocketProxy.prototype.createTarget = function() {
	try {
		// Build external channel
		var address = this.targetAddress+(this.targetPort?':'+this.targetPort:'');
		var sock = this.targetSock = new WebSocket('ws://'+address);
		sock.on('message', function(packet, flags) {
				this.send(packet);
			}.bind(this))
			.on('error', this._targetError.bind(this))
			.on('close', this._targetClosed.bind(this))
			.on('open', function() {
				log.info('Proxy connected to %s', address);
				this._clearTimer();
				this.proxyStatus.add(ProxyStatus.TARGET_CONNECTED);
				this.emit('connect'); //this.getEndpoint());
			}.bind(this));
		/*this.write = function(packet) {
			if(this.targetSock) {
				this.targetSock.send(packet);
			}
		}*/
		this.on('packet', function(packet) {
			
			console.log('packet =', packet);
			
			if(this.targetSock) {
				this.targetSock.send(packet);
			}
		}.bind(this));
		//this.emit('connect', this.srcep);
	}
	catch(err) {
	}
}

WebSocketProxy.prototype.createSource = function(callback) {
	var self = this;
	try {
		/*var sock = this.sourceSock = net.connect(this.sourcePort, function() {
			self.pipe(sock)
				.on('data', function(data) { debug('proxy =', data); })
				.on('error', self._sourceError.bind(self))
				.on('close', self._sourceClosed.bind(self))
				.on('end', function() {})
				.on('finish', function() {})
				.pipe(self);
			var packet = {
				cmd : Message.SERVICE_ANNCE,
				data : self.info()
			}
			packet = _encodeMessage(packet);
			sock.write(packet);
			callback(sock);
		});*/

		// Build internal channel
		var sock = this.sourceSock = net.connect(this.sourcePort, function() {
			var srcep = self.srcep = new ServiceEndpoint(sock, false, self.info()); 
			var address = srcep.getAddress();
			log.info('Proxy source endpoint connected %s', address);
			srcep.serviceAnnounce(self.info());
			callback(sock);
		});
	}
	catch(err) {
		log.error('Create the source', err);
		if(this.parentService) {
			var status = this.parentService.checkStatus();
			if(status != 0) {
				log.error('Parent service error');
			}
		}
	}
}

WebSocketProxy.prototype.closeSource = function(err) {
	this.proxyStatus.sub(ProxyStatus.SOURCE_CONNECTED);
	this.sourceSock.destroy(err);
	this.sourceSock = null;
}

WebSocketProxy.prototype.closeTarget = function(err) {
	this.targetSock.close();
	this.targetSock = null;
	if(this.proxyStatus.check(ProxyStatus.TARGET_CONNECTED)) {
		this.proxyStatus.sub(ProxyStatus.TARGET_CONNECTED);
		this.emit('disconnect');
	}
}

WebSocketProxy.prototype.start = function() {
	this.createTarget(); // External channel
}

/*
 * Utils
 */

WebSocketProxy.prototype._retryTarget = function() {
	log.info('Reconnect to target address %s',  this.targetAddress+':'+this.targetPort);
	if(!this.retryTimer) {
		this.retryTimer = setInterval(function() {
			if(!this.targetSock) {
				this.createTarget();
			}
		}.bind(this), this.retryInterval);
	}
}

WebSocketProxy.prototype._clearTimer = function() {
	this._errcount = 0;
	if(this.retryTimer) {
		clearInterval(this.retryTimer);
		this.retryTimer = null;
	}
}

var guidByData = function(data) {
	return aguid(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

module.exports = WebSocketProxy;

