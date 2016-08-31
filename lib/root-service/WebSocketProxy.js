/*
 * Copyright (c) 2016, Bigsens, LLC
 * Author: Constantin Alexandrov
 */

'use strict';

var net = require('net'),
	Enum = require('enum'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter,
	Message = require('./protocol').Message,
	WebSocket = require('ws'),
	log4js = global.log4js,
	log = log4js.getLogger('WebSocketProxy'),
	aguid = require('aguid');

var Message = new Enum(Message);

var targetAddress = 'localhost';
var targetPort = 8080;

var defaultServicePort = 13777;

// flag
var ProxyStatus = new Enum({
	LINKED : 0x00,
	NOT_LINKED : 0x01,
	SOURCE_NOT_CONNECTED : 0x02,
	TARGET_NOT_CONNECTED : 0x04
});

function WebSocketProxy(config) {

	this.name = 'WebSocket Proxy';
	this.version = '0.1';
	this.type = 'proxy';
	this.guid = guidByData(this.name+this.type+this.version),
	this.config = config || {};

	this.parentService = this.config.parentService || null;
	if(this.parentService) {
		this.guid = this.parentService.getGuid();
	}
	this.sourceAddress = 'localhost'; // if parentService true
	this.sourcePort = this.parentService ? this.parentService.servicePort : defaultServicePort;
	this.isSource = false;
	this.sourceSock;

	this.target = false;
	this.targetAddress = this.config.targetAddress || targetAddress;
	this.targetPort = this.config.targetPort || targetPort;
	this.targetSock;

	this.proxyStatus;

	this._errcount = 0;
	this.retryTimer = null;
	this.retryInterval = 10000;

	this.start.bind(this);

}

util.inherits(WebSocketProxy, EventEmitter);

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

/*
 * Handlers
 */

WebSocketProxy.prototype._sourceReceived = function(data, flags) {}
WebSocketProxy.prototype._targetReceived = function(data, flags) {}

WebSocketProxy.prototype._sourceError = function(err) {
	log.error('Source sock error', err);
	this.closeSource(err);
	// Try to restart
}

WebSocketProxy.prototype._targetError = function(err) {
	log.error('Target sock error', err);
	this.closeTarget(err);
	// Try to restart
}

WebSocketProxy.prototype._sourceClosed = function() {
	log.info('Source %j closed', this.info());
}

WebSocketProxy.prototype._targetClosed = function() {
	log.info('Target %s closed', this.targetAddress+':'+this.targetPort);
}

///////////


WebSocketProxy.prototype.createTarget = function() {
	var self = this;
	try {
		var sock = this.targetSock = new WebSocket('ws://'+this.targetAddress+':'+this.targetPort);
		sock.on('error', self._targetError.bind(self))
			.on('close', self._sourceClosed.bind(self))
			.on('message', function(data, flag) {})
			.on('open', function() {
				self._errcount = 0; // reset for the next time
				self.target = true;
				if(self.retryTimer) {
					clearInterval(self.retryTimer);
				}
				// Before linking check what the source is ready
			});
	}
	catch(err) {
		this._errcount++;
		log.error('Target connection error', err);
		if(!this.retryTimer) {
			this.retryTimer = setInterval(function() {
				if(!self.target) {
					createTarget();
				}
			}, this.retryInterval);
		}
	}
}

WebSocketProxy.prototype.createSource = function(callback) {
	var self = this;
	try {
		var sock = this.sourceSock = net.connect(this.sourcePort, function() {
			sock.on('error', self._sourceError.bind(self))
				.on('close', self._sourceClosed.bind(self))
				.on('end', function() {})
				.on('finish', function() {});
			var packet = {
				cmd : Message.SERVICE_ANNCE,
				data : self.info()
			}
			packet = _encodeMessage(packet);
			sock.write(packet);
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
	this.sourceSock.destroy(err);
	this.sourceSock = null;
}

WebSocketProxy.prototype.closeTarget = function(err) {
	this.targetSock = null;
}


WebSocketProxy.prototype.start = function() {
	var self = this;
	this.createSource(function() {
		// Source success
		self.emit('ready', self);
	});
}

// Just translate packets
WebSocketProxy.prototype.link = function() {

	// Reattach all listeners
	// Pipe sockets
	// Change proxy status

}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

var guidByData = function(data) {
	return aguid(data);
}

module.exports = WebSocketProxy;

