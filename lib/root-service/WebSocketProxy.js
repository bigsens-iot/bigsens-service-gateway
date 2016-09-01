/*
 * Copyright (c) 2016, Bigsens, LLC
 * Author: Constantin Alexandrov
 */

'use strict';

var net = require('net'),
	Enum = require('enum'),
	util = require('util'),
	Stream = require('stream'),
	debug = require('debug'),
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
	this.sourceSock;

	this.targetAddress = this.config.targetAddress || targetAddress;
	this.targetPort = this.config.targetPort || targetPort;
	this.targetSock;

	this.proxyStatus;

	this._errcount = 0;
	this.retryTimer = null;
	this.retryInterval = 10000;

	this.start.bind(this);

}

util.inherits(WebSocketProxy, Stream);

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
WebSocketProxy.prototype.end = function() {}
//WebSocketProxy.prototype.write = function() {}
WebSocketProxy.prototype.write = function(packet) {
	console.log('test!!!');
	if(this.targetSock) {
		this.targetSock.send(packet);
	}
}

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

///////////

WebSocketProxy.prototype.createTarget = function() {
	var self = this;
	try {
		var address = this.targetAddress+':'+this.targetPort;
		var sock = this.targetSock = new WebSocket('ws://'+address);
		sock.on('message', function(packet, flags) { this.emit('data', packet); }.bind(this))
			.on('error', self._targetError.bind(this))
			.on('close', self._targetClosed.bind(this))
			.on('open', function() {
				log.info('Proxy connected to %s', address);
				this._clearTimer();
			}.bind(this));
		this.write = function(packet) {
			if(this.targetSock) {
				this.targetSock.send(packet);
			}
		}.bind(this);
	}
	catch(err) {
	}
}

WebSocketProxy.prototype.createSource = function(callback) {
	var self = this;
	try {
		var sock = this.sourceSock = net.connect(this.sourcePort, function() {
			self.pipe(sock)
				.on('data', function(data) { debug('proxy-data', data); })
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
	this.targetSock.close();
	this.targetSock = null;
}

WebSocketProxy.prototype.start = function() {
	var self = this;
	this.createSource(function() {
		// Source success
		self.createTarget();
		self.emit('ready', self);
	});
}

var guidByData = function(data) {
	return aguid(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

module.exports = WebSocketProxy;

