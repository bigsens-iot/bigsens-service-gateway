/*
 * Copyright (c) 2016, Bigsens, LLC
 * Entity
 * Author: Constantin Alexandrov
 */

function Entity(className) {
	this.fields;
	var specField, defaultValue;
    Object.defineProperty(this, "_className", {value: className, configurable: false, enumerable: false, writable: false});
    Object.defineProperty(this, "_isTransient", {value: false, configurable: false, enumerable: false, writable: true});
    Object.defineProperty(this, "_isDirty", {value: false, configurable: false, enumerable: false, writable: true});
    Object.defineProperty(this, "_isStub", {value: false, configurable: false, enumerable: false, writable: true});
    Object.defineProperty(this, "_isDeleted", {value: false, configurable: false, enumerable: false, writable: true});
    for(var field in this.fields) {
        specField = this.fields[field];
        defaultValue = undefined;
        switch(specField.type) {
        	case "string":
        	defaultValue = "";
        	break;
        	case "number":
        	defaultValue = null;
            break;
        	case "boolean":
            defaultValue = false;
            break;
        	case "object":
            defaultValue = {};
            break;
        	default:
        	// throw
            break;
        }
        Object.defineProperty(this, field, {value: defaultValue, configurable: true, enumerable: true, writable: true});
    }
}

Entity.prototype.getPrimaryFields = function() {
	var spec = this.fields;
	var ret = [];
	for(var field in spec) {
		if(!spec.hasOwnProperty(field))
			continue;
        if(spec[field].isKey) {
        	ret.push(field);
        }
    }
    return ret;
}

