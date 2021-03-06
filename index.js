'use strict';

var lockfile = require('lockfile');

module.exports = FileLockedOperation;

function FileLockedOperation(lockFilePath, lockOpts) {
  this.lockFilePath = lockFilePath;
  this.opts = lockOpts || {wait: 1000, poll: 100};
}

FileLockedOperation.prototype.doLockedOperation = function(operation) {
  return getLock(this.lockFilePath, this.opts)
    .then(doOperation(this.lockFilePath, operation));
};

function getLock(lockFilePath, options) {
  return new Promise(function(resolve, reject) {
    lockfile.lock(lockFilePath, options, function(err) {
      if (err) {
        return reject(new Error('FileLockedOperation.doLockedOperation: ' +
          err.message));
      }
      resolve();
    });
  });
}

function doOperation(lockFilePath, operation) {
  return function() {
    return new Promise(function(resolve, reject) {
      var result,
          opError;

      try {
        result = operation();
      } catch (err) {
        opError = err;
      } finally {
        releaseLock(lockFilePath, opError, result, resolve, reject);
      }
    });
  };
}

function releaseLock(lockFilePath, opError, result, resolve, reject) {
  lockfile.unlock(lockFilePath, function(err) {
    if (err) {
      return reject(new Error('FileLockedOperation._releaseLock: ' +
        err.message));
    }
    opError ? reject(opError) : resolve(result);
  });
}
