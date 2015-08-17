// Generated by CoffeeScript 1.9.0
var CONCURRENT_DESTROY, ERRORMSG, LIMIT_DESTROY, MAX_RETRIES, Message, Process, RemoveAllMessagesFromAccount, async, log, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __hasProp = {}.hasOwnProperty;

Process = require('./_base');

_ref = require('../utils/constants'), MAX_RETRIES = _ref.MAX_RETRIES, CONCURRENT_DESTROY = _ref.CONCURRENT_DESTROY, LIMIT_DESTROY = _ref.LIMIT_DESTROY;

ERRORMSG = "DS has crashed ? waiting 4s before try again";

Message = require('../models/message');

async = require('async');

log = require('../utils/logging')('process:removebyaccount');

module.exports = RemoveAllMessagesFromAccount = (function(_super) {
  __extends(RemoveAllMessagesFromAccount, _super);

  function RemoveAllMessagesFromAccount() {
    this.destroyMessages = __bind(this.destroyMessages, this);
    this.fetchMessages = __bind(this.fetchMessages, this);
    this.step = __bind(this.step, this);
    this.notFinished = __bind(this.notFinished, this);
    return RemoveAllMessagesFromAccount.__super__.constructor.apply(this, arguments);
  }

  RemoveAllMessagesFromAccount.prototype.code = 'delete-messages-from-account';

  RemoveAllMessagesFromAccount.prototype.initialize = function(options, callback) {
    this.accountID = options.accountID;
    this.retries = MAX_RETRIES;
    return async.doWhilst(this.step, this.notFinished, callback);
  };

  RemoveAllMessagesFromAccount.prototype.notFinished = function() {
    return this.batch && this.batch.length > 0;
  };

  RemoveAllMessagesFromAccount.prototype.step = function(callback) {
    return this.fetchMessages((function(_this) {
      return function(err) {
        if (err) {
          return callback(err);
        }
        if (_this.batch.length === 0) {
          return callback(null);
        }
        return _this.destroyMessages(function(err) {
          if (err && _this.retries > 0) {
            log.warn(ERRORMSG, err);
            _this.retries--;
            return setTimeout(callback, 4000);
          } else if (err) {
            return callback(err);
          } else {
            _this.retries = MAX_RETRIES;
            return callback(null);
          }
        });
      };
    })(this));
  };

  RemoveAllMessagesFromAccount.prototype.fetchMessages = function(callback) {
    return Message.rawRequest('dedupRequest', {
      limit: LIMIT_DESTROY,
      startkey: [this.accountID],
      endkey: [this.accountID, {}]
    }, (function(_this) {
      return function(err, rows) {
        if (err) {
          return callback(err);
        }
        _this.batch = rows || [];
        return callback(null);
      };
    })(this));
  };

  RemoveAllMessagesFromAccount.prototype.destroyMessages = function(callback) {
    return async.eachLimit(this.batch, CONCURRENT_DESTROY, function(row, cb) {
      return Message.destroy(row.id, cb);
    }, callback);
  };

  return RemoveAllMessagesFromAccount;

})(Process);
