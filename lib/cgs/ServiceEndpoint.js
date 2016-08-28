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
	when = require('when'),
	aguid = require('aguid');

var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);


// One service can have several endpoints
function ServiceEndpoint(sock) {
	var self = this;
	this.endpointSocket = sock;
	this.address = sock.remoteAddress +':'+ sock.remotePort;
	
	// Endpoint id calculated during announcement with service GUID and endpoint name
	// Important: Endpoint name need to be unique in the endpoints namespace of the service
	this.id;
	this.longId;

	// FIFO buffer for pending requests
	this.pendingSyncResponses = {}; // Moved from prototype :)
	this.pendingSyncTimeout = 5000; // Resolve after that time if no response from service

	this.serviceInfo = null;

	//this.endpointSocket.on('error', this._handleError.bind(this));
	//this.endpointSocket.on('close', this._handleFinish.bind(this));	
	// Handle message from endpoint
	//this.endpointSocket.on('data', this._processIncomingMessage.bind(this));

	// Setup the bi-directional pipe between the endpoint and socket
	var streams = [ this, this.endpointSocket, this ],
		current = streams.shift(),
		next;
    while(next = streams.shift()) {
        current.pipe(next /*, { end : false } */)
        	// Attach listeners to all streams
        	.on('error', this._handleError.bind(this))
        	.on('close', this._handleClose.bind(this))
        	// For custom stream classes method end(void) need to be implemented
        	// or 'end' opts setting to false otherwise will be exception
        	// when pipe deleted, eg. client disconnect
        	.on('end', function() {
        		debug('No more data will be provided');
        	})
        	.on('finish', function() {
        		debug('All data has been flushed to the underlying system');
        	});
        current = next;
    }

	// Handlers message:name only for async methods
	this.on('message:SERVICE_ANNCE', this._serviceAnnouncement.bind(this));
}

util.inherits(ServiceEndpoint, IMessage);

// Don't remove, method for pipe, details in constructor
ServiceEndpoint.prototype.end = function() {}

/*
 * Accessors
 */

ServiceEndpoint.prototype.getAddress = function() {
	return this.address;
}

ServiceEndpoint.prototype.getId = function() {
	return this.id;
}

ServiceEndpoint.prototype.getGuid = function() {
	return this.serviceInfo ? this.serviceInfo.guid : 'undefined';
}

ServiceEndpoint.prototype.getName = function() {
	return this.serviceInfo ? this.serviceInfo.name : 'undefined';
}

ServiceEndpoint.prototype.getInfo = function() {
	return {
		name : this.getName(),
		address : this.getAddress(),
		id : this.getId(),
		guid : this.getGuid(),
		pendingCount : this.getPendingCount()
	};
}

ServiceEndpoint.prototype.getPendingCount = function() {
	var pendingCount = 0;
	_.forEach(this.pendingSyncResponses, function(pending) {
		if(pending && pending.length) {
			pendingCount += pending.length;
		}
	});
	return pendingCount;
}

////////

ServiceEndpoint.prototype.isAlive = function() {
	var sock = this.endpointSocket;
	return (sock && !sock.destroyed);
}

/*
 *  Wrappers
 */

ServiceEndpoint.prototype.write = function(data) {
	debug('incomingData', 'Processing data');
	this.processData(data);
}

ServiceEndpoint.prototype.send = function(packet) {
	if(this.isAlive()) {
		//this.endpointSocket.write(packet);
		this.emit('data', packet);
	}
}

ServiceEndpoint.prototype.closeConnection = function(err) {
	this.endpointSocket.destroy(err);
}

/*
 * Handlers
 */

ServiceEndpoint.prototype._handleError = function(err) {
	log.error('Socket error', err);
	this.closeConnection(err);
}

ServiceEndpoint.prototype._handleClose = function() {
	log.info('closeConnection', this.getAddress());
	this.emit('onClose', this);
}

ServiceEndpoint.prototype._serviceAnnouncement = function(info) {
	if(info) {
		if(info.name && info.guid) {
			log.info('Service announcement', fmtJson(info));
			this.serviceInfo = info;
			this.longId = aguid(this.getGuid()+this.getName());
			this.id = this.longId.split('-')[0];
		} else {
			var errmsg = 'No mandatory fields \'name\' and/or \'guid\'';
			debug('_serviceAnnouncement', errmsg);
			// send error to service end close connection
			this.closeConnection(new Error(errmsg));
		}
	} else {
		var errmsg = 'Description is empty';
		debug('_serviceAnnouncement', errmsg);
		// send error to service end close connection
		this.closeConnection(new Error(errmsg));
	}
}

/*
 * Message receivers
 */

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
			if(packet.req) { // Separate messages/requests and responses
				debug('processIncomingMessage', 'Name :', message.key, ', Data :', fmtJson(data));
				hadListeners = this.emit('message:' + message.key, data);
			}
		} else {
			log.warn('processIncomingMessage', 'Message with id %s not found', messageId);
		}
		if (!hadListeners) {
			this.emit('unhandledPacket', packet);
		}

		// Service messages only for the Service Gateway
		if(messageId == Message.SERVICE_ANNCE) {

			this.emit('message:' + message.key, data);

		} else if(!packet.req) {
			// Pass messages and requests
			this.emit('onReceive', packet);
		}

	}

	catch(err) {
		/* Collision problem?
		 * { ... } { ... }
		 *        ^
		 * Temporary skip that
		 */
		//log.error('_processIncomingMessage', err);
		debug('_processIncomingMessage', 'packet =', packet, 'error =', err);
	}

}

/*
 * Message senders
 */

ServiceEndpoint.prototype.sendMessage = function(message, data, req) {
	try {
		debug('sendMessage', 'Name: ' + message.key, ', Data:', fmtJson(data));
		var packet = { cmd : message.value, data : data };
		packet.req = req || false;
		packet = _encodeMessage(packet);
		this.send(packet);
		this.emit('onSend', packet);
	}
	catch(err) {
		log.error('sendMessage', err);
	}
}

ServiceEndpoint.prototype.syncRequest = function(messageName, data) {
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

	this.sendMessage(message, data, true);
	return deferred.promise
		.timeout(this.pendingSyncTimeout)
		.catch(releasePending);
}

ServiceEndpoint.prototype.asyncRequest = function(messageName, data) {
	// TODO
}


/*
 * Utils
 */

// data packing routines
var _decodeMessage = function(data) {
	return JSON.parse(data);
}

var _encodeMessage = function(data) {
	return JSON.stringify(data);
}

// other routines
function fmtJson(json) {
	return JSON.stringify(json, null, 2);
}

module.exports = ServiceEndpoint;

