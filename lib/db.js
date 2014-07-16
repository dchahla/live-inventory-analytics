"use strict";

var MongoClient = require('mongodb').MongoClient;
var Q = require('q');
var env = require('./env');
var log = require('./log')('mongodb');

var _pooledConnection = null;

var pooledConnection = function () {
    var deferred = Q.defer();

    if (_pooledConnection) {
        log.debug('returning pooled connection to MongoDB');

        deferred.resolve(_pooledConnection);
    } else {
        log.debug('initiating connection to MongoDB');

        var uri = env.str('TGTRAD_BTS2_MONGODB_URI');

        MongoClient.connect(uri, function (err, db) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                log.debug('completed connection to MongoDB');

                _pooledConnection = db;
                deferred.resolve(_pooledConnection);
            }
        });
    }

    return deferred.promise;
};

// normal CTRL-C exit
process.on('SIGINT', closePooledConnection);

// heroku uses SIGTERM to shutdown apps; 10 seconds then sends SIGKILL
// https://devcenter.heroku.com/articles/dynos#graceful-shutdown-with-sigterm
process.on('SIGTERM', closePooledConnection);

// If the Node process ends, close the Mongo connection pool
function closePooledConnection () {
    if (_pooledConnection) {
        log.debug("closing connection pool to MongoDB");
        _pooledConnection.close(function () {
            log.info("closed connection pool to MongoDB");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
}

module.exports = {
    pooledConnection: pooledConnection,
    closePooledConnection: closePooledConnection
};
