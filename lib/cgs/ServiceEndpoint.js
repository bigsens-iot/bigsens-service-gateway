/*
 * Copyright (c) 2016, Bigsens, LLC
 * Service Endpoint class for manage pipes, requests and status. Support only TCP messages.
 * Author: Constantin Alexandrov
 */

'use strict';

var _ = require('underscore'),
	P = require('./protocol'),
	IMessage = require('./IMessage'),
	//protoify = require('../protoify/index.js'),
	//ByteBuffer = require('protobufjs').ByteBuffer,
	util = require('util'),
	//EventEmitter = require('events').EventEmitter,
	log4js = global.log4js,
	log = log4js.getLogger('ServiceEndpoint'),
	debug = require('debug')('ServiceEndpoint'),
	Enum = require('enum'),
	Dissolve = require('dissolve'),
	when = require('when');

var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);

// One service can have several endpoints
function ServiceEndpoint(sock) {
	var self = this;
	this.serviceSock = sock;
	this.address = sock.remoteAddress +':'+ sock.remotePort;

	// FIFO buffer
	this.pendingSyncResponses = {}; // Move from prototype :)
	this.pendingSyncTimeout = 5000;

	this.serviceInfo = null;

	this.serviceSock.on('error', this._handleError.bind(this));
	this.serviceSock.on('close', this._handleClose.bind(this));	
	// Handle message from endpoint
	//this.serviceSock.on('data', this._processIncomingMessage.bind(this));

	// Setup the bi-directional pipe between the endpoint and socket.
    this.pipe(this.serviceSock).pipe(this);

	// Handlers message:name only for async methods
	this.on('message:SERVICE_ANNCE', this._serviceAnnouncement.bind(this));
}

util.inherits(ServiceEndpoint, IMessage);

ServiceEndpoint.prototype.getAddress = function() {
	return this.address;
}

ServiceEndpoint.prototype.getGuid = function() {
	return this.serviceInfo ? this.serviceInfo.guid : 'undefined';
}

ServiceEndpoint.prototype.getShortId = function() {
	var shortId = this.serviceInfo ? this.serviceInfo.guid : 'undefined';
	if(shortId) {
		shortId = shortId.split('-')[0];
	}
	return shortId;
}

ServiceEndpoint.prototype.getName = function() {
	return this.serviceInfo ? this.serviceInfo.name : 'undefined';
}

ServiceEndpoint.prototype.getInfo = function() {
	return {
		name : this.getName(),
		address : this.getAddress(),
		id : this.getShortId(),
		guid : this.getGuid()
	};
}

ServiceEndpoint.prototype.isAlive = function() {
	var sock = this.serviceSock;
	return (sock && !sock.destroyed);
}

ServiceEndpoint.prototype.send = function(packet) {
	if(this.isAlive()) {
		//this.serviceSock.write(packet);
		this.emit('data', packet);
	}
}

ServiceEndpoint.prototype.sendMessage = function(message, data, skipProxy) {
	try {
		debug('sendMessage', 'Name: ' + message.key, ', Data:', fmtJson(data));
		var packet = { cmd : message.value, data : data };
		packet.skipProxy = skipProxy || false;
		packet = _encodeMessage(packet);
		this.send(packet);
		this.emit('onSend', packet);
	}
	catch(err) {
		log.error('sendMessage', err);
	}
}

ServiceEndpoint.prototype._handleError = function(err) {
	log.error('Socket error', err);
	this.serviceSock.destroy(err);
}

ServiceEndpoint.prototype._handleClose = function() {
	log.info('closeConnection', this.getAddress());
	this.emit('onClose', this);
}

ServiceEndpoint.prototype.write = function(data) {
	debug('incomingData', 'Processing data');
	this.processData(data);
}

ServiceEndpoint.prototype.processData = function(message) {
	var length = message.length;
	var remainingMessage = message;
	var used;
	do {
		used = this._processIncomingMessage(remainingMessage);
		remainingMessage = remainingMessage.slice(used);
	    debug('Read message length ', used, 'of', length, '. ', remainingMessage.length,' remaining.');
	} while (remainingMessage.length && used > 0);
}

ServiceEndpoint.prototype._processIncomingMessage = function(packet) {

	try {
		packet = _decodeMessage(packet);
	}
	catch(err) {
		/* Collision problem?
		 * { ... } { ... }
		 *        ^
		 * Temporary skip that
		 */
		log.error('_processIncomingMessage', err);
		debug('_processIncomingMessage', 'packet =', packet);
	}
	if(!packet) return;

	var messageId = packet.cmd,
		data = packet.data,
		hadListeners = false,
		message = Message.get(messageId);

	// Add source address to the packet.
	if(!packet.src) {
		packet.src = this.getAddress();
	}

	if(message) {
		debug('processIncomingMessage', 'Name :', message.key, ', Data :', fmtJson(data));
		hadListeners = this.emit('message:' + message.key, data);
	} else {
		log.warn('processIncomingMessage', 'Message with id %s not found', messageId);
	}
	if (!hadListeners) {
		this.emit('unhandledPacket', packet);
	}

	// Service messages only for the Service Gateway
	if(messageId == Message.SERVICE_ANNCE) {
		// proxy to separate handler
	} else if(!packet.skipProxy) {
		// proxy up
		this.emit('onReceive', packet);
	}
}

ServiceEndpoint.prototype._serviceAnnouncement = function(info) {
	log.info('Service announcement', fmtJson(info));
	this.serviceInfo = info;
}

ServiceEndpoint.prototype.request = function(messageName, data, skipProxy) {
	debug('request to %s', this.getName());
	if (!data) {
		data = {};
	}
	var message = Message[messageName];
	if(!message) {
		log.error('Message with name %s not found', messageName);
	}
	var deferred = when.defer();

	var releasePending = function() {
		this.pendingSyncResponses[message.key].shift();
	}.bind(this);

	if(!this.pendingSyncResponses[message.key]) {
		this.pendingSyncResponses[message.key] = [];
		this.on('message:' + message.key, function(response) {
			try {
				debug('catch message from', this.getName(), 'data', response);
				this.pendingSyncResponses[message.key].shift()(response);
			}
			catch(err) {
				// Conflict when client send message not linked with the message from server
				// TypeError: this.pendingSyncResponses[message.key].shift(...) is not a function
				log.error('request', err);
				debug('message:' + message.key,
					'rsp =', response,
					'pending =', this.pendingSyncResponses
				);
			}
		}.bind(this));
	}
	this.pendingSyncResponses[message.key].push(function(response) {
		deferred.resolve(response);
	});

	this.sendMessage(message, data, skipProxy);
	return deferred.promise
		.timeout(this.pendingSyncTimeout)
		.catch(releasePending);
};

// data packing routines
var _decodeMessage = function(data) {
	return JSON.parse(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

// other routines
function fmtJson(json) {
	return JSON.stringify(json, null, 4);
}

module.exports = ServiceEndpoint;

