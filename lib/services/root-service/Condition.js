/*
 * Copyright (c) 2016, Bigsens, LLC
 * Condition stack machine
 * Author: Constantin Alexandrov
 */

'use strict';

var _ = require('underscore');

function Condition(sequence) {
	this.dataOffsets = {};
	this.sequence = sequence;
	for(var i=0; i<sequence.length; i++) {
		if(!Condition.opcodes[sequence[i]]) {
			this.dataOffsets[i] = sequence[i];
		}
	}			
}

Condition.opcodes = {
	'!' : function(ret) { return !ret.pop(); },
	'>' : function(ret) { return ret.pop()>ret.pop(); },
	'<' : function(ret) { return ret.pop()<ret.pop(); },
	'>=' : function(ret) { return ret.pop()>=ret.pop(); },
	'<=' : function(ret) { return ret.pop()<=ret.pop(); },
	'==' : function(ret) { return ret.pop()==ret.pop(); },
	'!=' : function(ret) { return ret.pop()!=ret.pop(); },
	'&&' : function(ret) { return ret.pop()&&ret.pop(); },
	'||' : function(ret) { var op1=ret.pop(),op2=ret.pop();return op1||op2; },
	'inrange' : function(ret) { var op=ret.pop();return (op>ret.pop()==op<ret.pop()); },
	'outrange' : function(ret) { return ['!','inrange',ret.pop(),ret.pop(),ret.pop()]; }
}

Condition.list = function() { return _.keys(Condition.opcodes); }

Condition.prototype.process = function(data) {
	_.each(this.dataOffsets, function(name, offset) {
		if(_.has(data, name)) {
			this.sequence[offset] = data[name];
		}
	}.bind(this));
	var buffer = [],
		sequence = _.clone(this.sequence);
	while(sequence.length > 0) {
		var opcode = sequence.pop();
		if(!Condition.opcodes[opcode]) {
			buffer.push(opcode);
		} else {
			var ret = Condition.opcodes[opcode](buffer);
			if(_.isArray(ret)) {
				sequence.push.apply(sequence, ret);
			} else {
				sequence.push(ret);
			}
		}
	}
	return buffer.pop();
}


module.exports = Condition;

