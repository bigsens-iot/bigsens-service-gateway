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


function Service(sock, dir, opts) {

	this.cfg = cfg || {};
	this.name = this.cfg.name; // Mandatory
	this.version = this.cfg.version;
	this.type = this.cfg.type;
	this.guid = guidByData(this.name+this.type+this.version);

	this.socket = cfg.socket || null;

	if(this.socket) {
		Service.super_.call(this, this.socket, false, this.info());
		var address = this.getAddress();
		log.info('%s endpoint connected %s', this.getName(), address);
		this.serviceAnnounce();
		this.emit('connected');
	} else {
		log.error('Service socket not found');
	}

}

util.inherits(Service, EventEmitter);

Service.prototype.getId = function() {
	return this.id;
}

Service.prototype.getGuid = function() {
	return this.guid;
}

Service.prototype.getName = function() {
	return this.name;
}

Service.prototype.getInfo = function() {
	return {
		name : this.getName(),
		guid : this.getGuid()
	};
}


Service.prototype._messageRegister = function(messages) {}
Service.prototype._messageUnregister = function(messages) {}


module.exports = Service;

