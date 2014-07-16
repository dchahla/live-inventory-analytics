"use strict";

var winston = require('winston');
var _ = require("lodash");
var env = require('./env');

var defaultOptions = {
    level: 'debug',
    colorize: true,
    timestamp: false,
    silent: false
};

function Logger(loggerName) {
    var options = _.clone(defaultOptions);

    // add the level
    options.level = determineLevel(loggerName);

    // add the label
    options.label = loggerName;

    // global shutoff
    options.silent = env.bool('TGTRAD_LOGS.silent', { default: false});

    return winston.loggers.get(loggerName, {console: options});
}

function determineLevel(loggerName) {
    // add the level, local logger > system override
    var localLevel = env.str('TGTRAD_LOGS.' + loggerName + ".level", { required: false});

    return localLevel || exports.syslevel || exports.defaultLevel;
}

exports = module.exports = Logger;

exports.syslevel = env.str('TGTRAD_LOGS.level', { required: false });
exports.defaultLevel = 'info';
