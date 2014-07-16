"use strict";

var assert = require('assert');
var util = require('util');
var _ = require('lodash');

var bool = function (propName, options) {
    var o = _.defaults(_.clone(options), { required: true });
    var p = process.env[propName];

    if (_.isUndefined(p) && _.has(o, 'default') && !_.isUndefined(o.default)) {
        p = o.default;
    }

    if (!_.has(o, 'required') || o.required !== false) {
        assert(!_.isUndefined(p), util.format("Cannot find required environment property %s", propName));
        p = _.isString(p) ? p.toLowerCase() : p;
    }

    return _.isBoolean(p) ? p : p === "true";
};

var str = function (propName, options) {
    var o = _.defaults(_.clone(options), { required: true });
    var p = process.env[propName];

    if (_.isUndefined(p) && _.has(o, 'default') && !_.isUndefined(o.default)) {
        p = o.default;
    }

    if (!_.has(o, 'required') || o.required !== false) {
        assert(p, util.format("Cannot find required environment property %s", propName));
    }

    return p;
};

module.exports = {
    str: str,
    bool: bool
};