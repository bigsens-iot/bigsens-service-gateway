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

IMessage.prototype.messageRegister = function(messages) {
	return this.sendMessage('MESSAGE_REGISTER', messages);
}

IMessage.prototype.serviceAnnounce = function(args) {
	return this.sendMessage('SERVICE_ANNCE', args);
}

IMessage.prototype.serviceInfo = function() {}

IMessage.prototype.getDeviceList = function() {
	return this.syncRequest('DEVICE_LIST');
}

IMessage.prototype.getDeviceInfoById = function() {}
IMessage.prototype.getDeviceExtendedInfoById = function() {}

module.exports = IMessage;

