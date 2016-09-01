/*
 * Copyright (c) 2016, Bigsens, LLC
 * Author: Constantin Alexandrov
 */

'use strict';

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	WebSocketProxy = require('./WebSocketProxy'),
	log4js = global.log4js,
	log = log4js.getLogger('RemoteConnect');

function RemoteConnect(config) {

	this.config = config || {};

	this.serverAddress = this.config.serverAddress || 'localhost';
	this.serverPort = this.config.serverPort || 8080;

	this.connType = this.config.connType || null;
	this.conn; // Connection object
	this.connep; // Internal endpoint

}

util.inherits(RemoteConnect, EventEmitter);

RemoteConnect.prototype.start = function() {

	var conn = this.conn = new WebSocketProxy({
		parentService : this.config.parentService,
		targetAddress : this.serverAddress,
		targetPort : this.serverPort
	});

	conn.on('ready', function() {
		log.info('WebSocket Proxy is ready');
		var ep = conn.getEndpoint();
		if(ep) {
			this.emit('ready', ep);
		} else {
			// Something wrong
		}
	}.bind(this));

	conn.start();

}

module.exports = RemoteConnect;
