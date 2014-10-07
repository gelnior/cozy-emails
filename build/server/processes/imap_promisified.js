// Generated by CoffeeScript 1.7.1
var Imap, ImapPromisified, MailParser, Promise, WrongConfigError, log, stream_to_buffer_array;

Imap = require('imap');

Promise = require('bluebird');

MailParser = require('mailparser').MailParser;

WrongConfigError = require('../utils/errors').WrongConfigError;

log = require('../utils/logging')({
  prefix: 'imap:promise'
});

stream_to_buffer_array = function(stream, cb) {
  var parts;
  parts = [];
  stream.on('error', function(err) {
    return cb(err);
  });
  stream.on('data', function(d) {
    return parts.push(d);
  });
  return stream.on('end', function() {
    return cb(null, parts);
  });
};

Promise.promisifyAll(Imap.prototype, {
  suffix: 'Promised'
});

module.exports = ImapPromisified = (function() {
  ImapPromisified.prototype.state = 'not connected';

  ImapPromisified.prototype.onTerminated = function() {};

  function ImapPromisified(options) {
    var logger;
    logger = require('../utils/logging')({
      prefix: 'imap:raw'
    });
    options.debug = logger.debug.bind(logger);
    this._super = new Imap(options);
    this.waitConnected = new Promise((function(_this) {
      return function(resolve, reject) {
        _this._super.once('ready', function() {
          _this.state = 'connected';
          return resolve(_this);
        });
        _this._super.once('error', function(err) {
          _this.state = 'errored';
          if (_this.waitConnected.isPending()) {
            return reject(err);
          }
        });
        return _this._super.connect();
      };
    })(this)).timeout(10000, 'cant reach host')["catch"]((function(_this) {
      return function(err) {
        if (err.textCode === 'AUTHENTICATIONFAILED') {
          throw new WrongConfigError('auth');
        }
        if (err.code === 'ENOTFOUND' && err.syscall === 'getaddrinfo') {
          throw new WrongConfigError('server');
        }
        if (err instanceof Promise.TimeoutError) {
          _this._super.end();
          throw new WrongConfigError('port');
        }
        if (err.source === 'timeout-auth') {
          throw new WrongConfigError('tls');
        }
        throw err;
      };
    })(this)).tap((function(_this) {
      return function() {
        _this._super.once('error', function(err) {
          return log.error("ERROR ?", err);
        });
        _this._super.once('close', function() {
          if (!_this.waitEnding) {
            if (typeof _this.onTerminated === "function") {
              _this.onTerminated();
            }
          }
          return _this.closed = true;
        });
        return _this._super.once('end', function() {
          if (!_this.waitEnding) {
            if (typeof _this.onTerminated === "function") {
              _this.onTerminated();
            }
          }
          return _this.closed = true;
        });
      };
    })(this));
  }

  ImapPromisified.prototype.end = function(hard) {
    if (this.state === 'closed') {
      return Promise.resolve('closed');
    }
    if (this.waitEnding) {
      return this.waitEnding;
    }
    return this.waitEnding = this.waitConnected["catch"](function() {
      return Promise.resolve('closed');
    }).then((function(_this) {
      return function() {
        return new Promise(function(resolve, reject) {
          if (hard) {
            _this._super.destroy();
            return resolve('closed');
          } else {
            _this._super.end();
          }
          _this._super.once('error', function() {
            return resolve(new Error('fail to logout'));
          });
          _this._super.once('end', function() {
            return resolve('closed');
          });
          return _this._super.once('close', function() {
            return resolve('closed');
          });
        });
      };
    })(this));
  };

  ImapPromisified.prototype.getBoxes = function() {
    return this._super.getBoxesPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.openBox = function(name) {
    var _ref;
    if (((_ref = this._super._box) != null ? _ref.name : void 0) === name) {
      return Promise.resolve(this._super._box);
    }
    return this._super.openBoxPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.append = function() {
    return this._super.appendPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.search = function() {
    return this._super.searchPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.move = function() {
    return this._super.movePromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.expunge = function() {
    return this._super.expungePromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.copy = function() {
    return this._super.copyPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.setFlags = function() {
    return this._super.setFlagsPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.delFlags = function() {
    return this._super.delFlagsPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.addFlags = function() {
    return this._super.addFlagsPromised.apply(this._super, arguments);
  };

  ImapPromisified.prototype.fetchBoxMessageIds = function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var results;
        results = {};
        return _this.search([['ALL']]).then(function(ids) {
          var fetch;
          fetch = _this._super.fetch(ids, {
            bodies: 'HEADER.FIELDS (MESSAGE-ID)'
          });
          fetch.on('error', reject);
          fetch.on('message', function(msg) {
            var messageID, uid;
            uid = null;
            messageID = null;
            msg.on('error', function(err) {
              return result.error = err;
            });
            msg.on('attributes', function(attrs) {
              return uid = attrs.uid;
            });
            msg.on('end', function() {
              return results[uid] = messageID;
            });
            return msg.on('body', function(stream) {
              return stream_to_buffer_array(stream, function(err, parts) {
                var header;
                if (err) {
                  return log.error(err);
                }
                header = Buffer.concat(parts).toString('utf8').trim();
                return messageID = header.substring(header.indexOf(':'));
              });
            });
          });
          return fetch.on('end', function() {
            return resolve(results);
          });
        });
      };
    })(this));
  };

  ImapPromisified.prototype.fetchOneMail = function(id) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var fetch, flags, messageReceived;
        fetch = _this._super.fetch([id], {
          size: true,
          bodies: ''
        });
        messageReceived = false;
        flags = [];
        fetch.on('message', function(msg) {
          messageReceived = true;
          msg.once('error', reject);
          msg.on('attributes', function(attrs) {
            return flags = attrs.flags;
          });
          return msg.on('body', function(stream) {
            return stream_to_buffer_array(stream, function(err, buffers) {
              var mailparser, part, _i, _len;
              if (err) {
                return reject(err);
              }
              mailparser = new MailParser();
              mailparser.on('error', reject);
              mailparser.on('end', function(mail) {
                mail.flags = flags;
                return resolve(mail);
              });
              for (_i = 0, _len = buffers.length; _i < _len; _i++) {
                part = buffers[_i];
                mailparser.write(part);
              }
              return mailparser.end();
            });
          });
        });
        fetch.on('error', reject);
        return fetch.on('end', function() {
          if (!messageReceived) {
            return reject(new Error('fetch ended with no message'));
          }
        });
      };
    })(this));
  };

  return ImapPromisified;

})();
