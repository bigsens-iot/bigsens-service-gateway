/*
 * Copyright (c) 2016, Bigsens, LLC
 * Author: Constantin Alexandrov
 */

'use strict';

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	WebSocketProxy = require('../services/websocket-proxy/WebSocketProxy'),
	log4js = global.log4js,
	log = log4js.getLogger('RemoteConnect'),
	debug = require('debug')('RemoteConnect');


function RemoteConnect(config) {

	this.config = config || {};

	this.connName = 'Remote Server';
	this.serverAddress = this.config.serverAddress || 'localhost';
	this.serverPort = this.config.serverPort;

	this.connType = this.config.connType || null;
	this.conn; // Connection object
	this.intEp; // Internal endpoint

}

util.inherits(RemoteConnect, EventEmitter);

RemoteConnect.prototype.info = function() {
	return {
		connName : this.connName,
		serverAddress : this.serverAddress,
		serverPort : this.serverPort
	};
}

RemoteConnect.prototype.getName = function() {
	return this.connName;
}

RemoteConnect.prototype.start = function() {

	var conn = this.conn = new WebSocketProxy({
		parentService : this.config.parentService,
		targetAddress : this.serverAddress,
		targetPort : this.serverPort
	});

	conn.on('connect', function() {
		debug('Remote %s is connected', this.getName());
		//if(ep) {
			//this.intEp = ep;
			// Proxy will pass responses to the remote address
			conn.machineConnect(this.info());
			//conn.machineInfo();
			/*conn.machineConnect(this.info())
				.then(conn.machineInfo())
				//.then(function(machineInfo) { debug('machineInfo %j', machineInfo); })
				//.then(conn.getDeviceList.bind(conn))
				.done();*/
			this.emit('ready', conn);
		//} else {
			// Something wrong
		//}
	}.bind(this));

	conn.on('disconnect', function() {
		debug('Remote %s is disconnected', this.getName());
		//if(this.intEp) {
			conn.machineDisconnect(this.info());
		//}
	}.bind(this));

	conn.start();

}

module.exports = RemoteConnect;

