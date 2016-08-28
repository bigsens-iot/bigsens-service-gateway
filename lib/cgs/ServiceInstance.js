/*
 * Copyright (c) 2016, Bigsens, LLC
 * Service Instance is a application level wrap for the container runtime
 * This is way for Service Gateway to manage services before Service Endpoint created
 * Author: Constantin Alexandrov
 */

'use strict';

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	monitor = require('node-docker-monitor')
	log4js = global.log4js,
	log = log4js.getLogger('ServiceInstance'),
	debug = require('debug')('ServiceInstance');

function ServiceInstance(config) {
	this.config = config || {};
	this.id;
}

util.inherits(ServiceGateway, EventEmitter);

ServiceInstance.prototype.start = function() {}
ServiceInstance.prototype.stop = function() {}
ServiceInstance.prototype.restart = function() {}
ServiceInstance.prototype.status = function() {}

var startMonitor = function() {
	var dockerOpts = { sockPath: process.env.DOCKER_SOCKET };
	if(!dockerOpts.sockPath) {
	    dockerOpts.host = process.env.DOCKER_HOST;
	    dockerOpts.port = process.env.DOCKER_PORT;
	    if(!dockerOpts.host) {
	        dockerOpts.sockPath = '/var/run/docker.sock';
	    }
	}
	log.info('Docker opts: %j', dockerOpts);
	monitor({
		onContainerUp: function(containerInfo, docker) {
	        if(containerInfo.Labels && containerInfo.Labels.serviceMeta) {
	            var container = docker.getContainer(containerInfo.Id),
	            	serviceMeta = containerInfo.Labels.serviceMeta;
	            container.inspect(function (err, containerDetails) {
	                if(err) {
	                	log.error('Error getting container details for %j', containerInfo, err);
	                } else {
	                    try {
	                        // TODO: Update service instance info and make other routines
	                    	
	                    	console.log('Inspect %j', containerDetails);

	                    } catch (e) {
	                    	log.error('Something wrong %j', containerDetails, e);
	                    }
	                }
	            });
	        }
	    },
	    onContainerDown: function(container) {
	        if(container.Labels && container.Labels.serviceMeta) {
	        	// TODO: Do something with container.Id
	        }
	    }
	}, dockerOpts, {
		strategy: 'monitorSelected',
		selectorLabel: 'serviceMeta'
	});
}

//startMonitor();

module.exports = ServiceInstance;

