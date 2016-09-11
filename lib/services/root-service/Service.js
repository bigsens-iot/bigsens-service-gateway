/*
 * Copyright (c) 2016, Bigsens, LLC
 * Service
 * Author: Constantin Alexandrov
 */

'use strict';

var P = global.P,
	_ = require('underscore'),
	net = require('net'),
	aguid = require('aguid'),
	Enum = require('enum'),
	Q = require('q'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter,
	ServiceEndpoint = require('./ServiceEndpoint'),
	log4js = global.log4js,
	log = log4js.getLogger('Service'),
	debug = require('debug')('Service');

var Message = new Enum(P.Message),
	DeviceState = new Enum(P.DeviceState),
	DeviceType = new Enum(P.DeviceType);


function Service(cfg) {

	this.cfg = cfg || {};
	this.name = this.cfg.name; // Mandatory
	this.version = this.cfg.version;
	this.type = this.cfg.type;
	this.guid = guidByData(this.name+this.type+this.version);

	var endpoints = {};	// Additional endpoints
}

util.inherits(Service, ServiceEndpoint);

Service.prototype.info = function() {
	return {
		guid : this.guid,
		name : this.name,
		type : this.type,
		version : this.version
	};
}

Service.prototype.getName = function() {
	return this.name;
}

Service.prototype.getGuid = function() {
	return this.guid;
}

Service.prototype.createEndpoint = function(name, targetAddress, targetPort) {
	this.socket = net.connect(servicePort, function() {
		Service.super_.call(this, this.socket, false, this.info());
		var address = this.getAddress();
		log.info('%s endpoint connected %s', this.getName(), address);
		this.serviceAnnounce();
		this.emit('connected');
	}.bind(this));
}

// [ name1, name2, ... nameN ]
Service.prototype.registerMessages = function(messages) {
	this.sendMessage('REGISTER_MESSAGES', messages);
}


module.exports = Service;

