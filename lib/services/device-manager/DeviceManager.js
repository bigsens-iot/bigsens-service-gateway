/*
 * Copyright (c) 2016, Bigsens, LLC
 * Device Manager service
 * Author: Constantin Alexandrov
 */

'use strict';

var net = require('net'),
	Enum = require('enum'),
	util = require('util'),
	Stream = require('stream'),
	Message = require('./protocol').Message,
	ServiceEndpoint = require('./ServiceEndpoint'),
	WebSocket = require('ws'),
	log4js = global.log4js,
	log = log4js.getLogger('DeviceManager'),
	debug = require('debug')('DeviceManager'),
	aguid = require('aguid');

var Message = new Enum(Message);

var defaultServicePort = 13777;

function DeviceManager(config) {

	this.name = 'Device Manager';
	this.version = '0.1';
	this.guid = guidByData(this.name+this.version),
	this.config = config || {};

	this.devices = {}; // key: service, value: device

}

util.inherits(DeviceManager, Stream);

DeviceManager.prototype.info = function() {	
	return {
		guid : this.guid,
		name : this.name,
		version : this.version
	};
}

DeviceManager.prototype.getName = function() {
	return this.name;
}

DeviceManager.prototype.getGuid = function() {
	return this.guid;
}

DeviceManager.prototype.getEndpoint = function() {
	return this.srcep;
}
