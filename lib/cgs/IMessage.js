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

// overload
IMessage.prototype.request = function(messageName, data) {}

IMessage.prototype.getServiceInfo = function() {}

IMessage.prototype.getDeviceList = function() {
	return this.request('DEVICE_LIST')
		.then(function(response) {
			return response;
		});
}

IMessage.prototype.getDeviceInfoById = function() {}
IMessage.prototype.getDeviceExtendedInfoById = function() {}

module.exports = IMessage;

