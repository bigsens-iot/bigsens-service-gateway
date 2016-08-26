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
	EventEmitter = require('events').EventEmitter,
	log4js = global.log4js,
	log = log4js.getLogger('ServiceEndpoint'),
	debug = require('debug')('ServiceEndpoint'),
	Enum = require('enum'),
	Dissolve = require('dissolve'),
	when = require('when');

var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);

function ServiceEndpoint(sock) {
	var self = this;
	this.serviceSock = sock;
	this.address = sock.remoteAddress +':'+ sock.remotePort;

	this.serviceInfo = null;

	this.serviceSock.on('error', this._handleError.bind(this));
	this.serviceSock.on('close', this._handleClose.bind(this));	
	// handle message from service
	this.serviceSock.on('data', this._processIncomingMessage.bind(this));

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

ServiceEndpoint.prototype.isAlive = function() {
	var sock = this.serviceSock;
	return (sock && !sock.destroyed);
}

ServiceEndpoint.prototype.send = function(msg) {
	if(this.isAlive())
		this.serviceSock.write(msg);
}

ServiceEndpoint.prototype.sendMessage = function(message, data) {
	try {
		debug('sendMessage', 'Name: ' + message.key, ', Data:', fmtJson(data));
		var packet = { cmd : message.value, data : data };
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

ServiceEndpoint.prototype._processIncomingMessage = function(packet) {
	packet = _decodeMessage(packet);
	var messageId = packet.cmd,
		data = packet.data,
		hadListeners = false,
		message = Message.get(messageId);

	if(message) {
		debug('processIncomingMessage', 'Name :', message.key, ', Data :', fmtJson(data));
		hadListeners = this.emit('message:' + message.key, data);
	} else {
		log.warn('processIncomingMessage', 'Message with id %s not found', messageId);
	}
	if (!hadListeners) {
		this.emit('unhandledPacket', packet);
	}
	// proxy up
	packet = _encodeMessage(packet);
	this.emit('onReceive', this, packet);
}

ServiceEndpoint.prototype._serviceAnnouncement = function(info) {
	log.info('Service announcement', fmtJson(info));
	this.serviceInfo = info;
}

ServiceEndpoint.prototype.pendingSyncResponses = {};
ServiceEndpoint.prototype.request = function(messageName, data) {
	if (!data) {
		data = {};
	}
	var message = Message[messageName];
	if(!message) {
		log.error('Message with name %s not found', messageName);
	}
	var deferred = when.defer();
	if(!this.pendingSyncResponses[message.key]) {
		this.pendingSyncResponses[message.key] = [];
		this.on('message:' + message.key, function(response) {
			this.pendingSyncResponses[message.key].shift()(response);
		}.bind(this));
	}
	this.pendingSyncResponses[message.key].push(function(response) {
		deferred.resolve(response);
	});
	this.sendMessage(message, data);
	return deferred.promise;
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

