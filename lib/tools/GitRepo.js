/*
 * Copyright (c) 2016, Bigsens, LLC
 * GitRepo
 * Author: Constantin Alexandrov
 */

'use strict';

var _ = require('underscore'),
	log4js = global.log4js,
	log = log4js.getLogger('GitRepo'),
	debug = require('debug')('GitRepo');

function getUserHome() { return process.env['HOME'] || '/root'; }

function GitRepo() {}

GitRepo.pull = function(info, callback) {
	var rsp = { status: -1 };
	if(!info.shortName && !info.workingDir) {
		log.error('Service params @shortName or @workingDir not found.');
		return;
	}
	var workingPath = getUserHome() + '/' + info.workingDir;
	log.info('Working path =', workingPath);
	require('simple-git')(workingPath)
    	.then(function() {
    		log.info('Starting pull for %s', info.shortName);
    	}).pull(function(err, update) {
    		if(update && update.summary.changes) {
    			rsp = { status : 0, message : 'Service updated' };
    		} else {
    			rsp = { status : 1, message : 'Service up to date' };
    		}
    	}).then(function() {
    		console.log('Pull for %s done', info.shortName);
    		callback(rsp);
    	});
}

module.exports = GitRepo;

