"use strict";

// perform environment variable initialization as soon as possible so other libraries may benefit
var dotenv = require('dotenv');
dotenv.load();

var db = require("./lib/db");
var Q = require('q');
Q.longStackSupport = true;
var _ = require('lodash');

var influx = require('influx');
var client = influx({host: '198.199.111.87', username: 'tgtrad-bts2', password: 'tgtrad-bts2', database: 'bts2-product-inventory'});

var storeIds = ['267', '310', '311', '312', '1025', '1097', '1098', '1121', '1502', '1527', '2115', '2214', '2268', '2270', '2408', '2455', '2463', '2492', '2604', 'home'];

function tieItUp() {
    db.pooledConnection()
        .then(function (db) {
            console.log('running');
            return gettingAllProducts(db);
        })
        .then(function (products) {
            return products;
        })
        .then(function (products) {
            return mapLimit(products, 5, productsByStore);
        })
        .then(function (productAvailByTCIN) {
            return mapLimit(productAvailByTCIN, 5, writeInflux);
        })
        .then(function (created) {
            console.log('finished');
            return true;
        })
        .done(function () {
            db.closePooledConnection();
        });
}

function productsByStore(product) {
    var data = [];

    if (product.availability) {
        storeIds.forEach(function (storeId) {
            var seriesKey = product.id + '-' + storeId;
            var availability = product.availability[storeId];

            if (availability) {
                try {
                    data.push({k: seriesKey, v: availability.onhandQuantity});
                } catch (err) {
                    console.log('seriesKey: ', seriesKey, product.err);
                    throw err;
                }
            } else {
                console.log('no availability for %s', seriesKey);
            }
        });
    }

    return data;
}

function writeMulti(series) {
    var ts = new Date();
    var data = [];

    series.forEach(function (s) {
        data.push({t: ts, key: s.k, v: s.v})
    });

    var deferred = Q.defer();
    tempodb.write_multi(data, function (err, result) {
        if (err) {
            console.log(err);
            deferred.reject(err);
        } else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
}

function writeInflux(series) {

    return mapLimit(series, 5, function (s) {
        var deferred = Q.defer();

        client.writePoint(s.k, {attr: s.v}, {}, function (err, data) {
            if (err) {
                console.error('Error! -', err);
                deferred.reject(err);
            }

            deferred.resolve(true);
        });

        return deferred.promise;
    });
}

function map(arr, func) {
    return Q().then(function () {
        return arr.map(function (el) {
            return func(el)
        })
    }).all()
}

function mapLimit(arr, limit, func) {
    var batches = arr.reduce(function (last, next, index) {
        if (index % limit == 0) {
            last.push([next]);
        } else {
            last[last.length - 1].push(next)
        }
        return last;
    }, []);

    var currentPromise = Q();
    var promises = batches.map(function (batch) {
        return currentPromise = currentPromise.then(function () {
            var batchPromises = batch.map(function (el) {
                return func(el);
            });
            return Q.all(batchPromises);
        });
    });

    return Q.all(promises)
        .then(function (results) {
            return Array.prototype.concat.apply([], results); // flatten array
        });
}

function gettingAllProducts(db) {
    var deferred = Q.defer();

    db.collection('products')
        .find()
        .toArray(function (err, products) {
            if (err) {
                deferred.revoke(err);
            } else {
                deferred.resolve(products);
            }
        });

    return deferred.promise;
}

Q.timeout(tieItUp(), 10 * 1000);
