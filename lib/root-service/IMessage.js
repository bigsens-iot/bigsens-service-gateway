/*
 * Copyright (c) 2016, Bigsens, LLC
 * Message Interface for internal communication between services.
 * Author: Constantin Alexandrov
 */

'use strict';

var util = require('util'),
	Stream = require('stream');

/*
 * Message API interface.
 */

function IMessage() {}
util.inherits(IMessage, Stream);

IMessage.prototype.serviceAnnounce = function(args) {
	this.sendMessage('SERVICE_ANNCE', args);
}

IMessage.prototype.gatewayConnect = function(args) {
	this.sendMessage('GATEWAY_CONNECT', args);
}

IMessage.prototype.gatewayDisconnect = function(args) {
	this.sendMessage('GATEWAY_DISCONNECT', args);
}

IMessage.prototype.gatewayInfo = function() {
	return this.syncRequest('GATEWAY_INFO').then(function(response) {
		return response;
	});
}

IMessage.prototype.serviceInfo = function() {}

IMessage.prototype.getDeviceList = function() {
	return this.syncRequest('DEVICE_LIST').then(function(response) {
		return response;
	});
}

IMessage.prototype.getDeviceInfoById = function() {}
IMessage.prototype.getDeviceExtendedInfoById = function() {}

module.exports = IMessage;

