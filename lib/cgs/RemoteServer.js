/*
 * Copyright (c) 2016, Bigsens, LLC
 * Remote Server is just simple workaround for the NAT.
 * Author: Constantin Alexandrov
 */

'use strict';

var net = require('net'),
	P = require('./protocol'),
	//protoify = require('../protoify/index.js'),
	//ByteBuffer = require('protobufjs').ByteBuffer,
	assert = require('assert'),
	util = require('util'),
	Stream = require('stream'),
	log4js = global.log4js,
	log = log4js.getLogger('RemoteServer'),
	WebSocket = require('ws');

var gatewayHost = 'localhost';

function RemoteServer(config) {

	this.name = 'Remote Service';
	this.version = '0.1';
	this.config = config || {};

	this.address = this.config.address || gatewayHost;
	this.port = this.config.port || 8080;

	this.webSocket = null;
	this.isConnected = false;

	this.start.bind(this);

}

util.inherits(RemoteServer, Stream);

RemoteServer.prototype.send = function(data) {
	if(this.isConnected) {
		this.webSocket.send(data);
	} else {
		log.warn('Not connected');
	}
}

RemoteServer.prototype.start = function() {
	var self = this;
	this.webSocket = new WebSocket('ws://'+this.address+':'+this.port);
	this.webSocket.on('open', function open() {
		self.isConnected = true;
		self.emit('onReady', self);
	});

	this.webSocket.on('message', function(data, flags) {
		self.emit('onMessage', data);
	});

}

module.exports = RemoteServer;

