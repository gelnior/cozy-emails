// Generated by CoffeeScript 1.8.0
var Account, AccountConfigError, Compiler, ImapPool, ImapReporter, Mailbox, Message, SMTPConnection, americano, async, log, nodemailer, _,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

americano = require('americano-cozy');

module.exports = Account = americano.getModel('Account', {
  label: String,
  name: String,
  login: String,
  password: String,
  accountType: String,
  smtpServer: String,
  smtpPort: Number,
  smtpSSL: Boolean,
  smtpTLS: Boolean,
  imapServer: String,
  imapPort: Number,
  imapSSL: Boolean,
  imapTLS: Boolean,
  inboxMailbox: String,
  draftMailbox: String,
  sentMailbox: String,
  trashMailbox: String,
  junkMailbox: String,
  allMailbox: String,
  favorites: function(x) {
    return x;
  }
});

Mailbox = require('./mailbox');

Message = require('./message');

Compiler = require('nodemailer/src/compiler');

ImapPool = require('../imap/pool');

ImapReporter = require('../imap/reporter');

AccountConfigError = require('../utils/errors').AccountConfigError;

nodemailer = require('nodemailer');

SMTPConnection = require('nodemailer/node_modules/' + 'nodemailer-smtp-transport/node_modules/smtp-connection');

log = require('../utils/logging')({
  prefix: 'models:account'
});

_ = require('lodash');

async = require('async');

Account.prototype.doASAP = function(operation, callback) {
  return ImapPool.get(this.id || this).doASAP(operation, callback);
};

Account.prototype.isTest = function() {
  return this.accountType === 'TEST';
};

Account.refreshAllAccounts = function(limit, onlyFavorites, callback) {
  return Account.request('all', function(err, accounts) {
    if (err) {
      return callback(err);
    }
    return async.eachSeries(accounts, function(account, cb) {
      log.debug("refreshing account " + account.label);
      if (account.isTest()) {
        return cb(null);
      }
      return account.imap_fetchMails(limit, onlyFavorites, cb);
    }, callback);
  });
};

Account.createIfValid = function(data, callback) {
  var account, toFetch;
  account = new Account(data);
  toFetch = null;
  return async.series([
    function(cb) {
      log.debug("create#testConnections");
      return account.testConnections(cb);
    }, function(cb) {
      log.debug("create#cozy");
      return Account.create(account, function(err, created) {
        if (err) {
          return cb(err);
        }
        account = created;
        return cb(null);
      });
    }, function(cb) {
      log.debug("create#refreshBoxes");
      return account.imap_refreshBoxes(function(err, boxes) {
        if (err) {
          return cb(err);
        }
        toFetch = boxes;
        return cb(null);
      });
    }, function(cb) {
      log.debug("create#scan");
      return account.imap_scanBoxesForSpecialUse(toFetch, cb);
    }
  ], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, account);
  });
};

Account.prototype.testConnections = function(callback) {
  if (this.isTest()) {
    return callback(null);
  }
  return this.testSMTPConnection((function(_this) {
    return function(err) {
      if (err) {
        return callback(err);
      }
      return ImapPool.test(_this, function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null);
      });
    };
  })(this));
};

Account.prototype.forgetBox = function(boxid, callback) {
  var attribute, changes, _i, _len, _ref;
  changes = {};
  _ref = Object.keys(Mailbox.RFC6154);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    attribute = _ref[_i];
    if (this[attribute] === boxid) {
      changes[attribute] = null;
    }
  }
  if (__indexOf.call(this.favorites, boxid) >= 0) {
    changes.favorites = _.without(this.favorites, boxid);
  }
  if (Object.keys(changes).length) {
    return this.updateAttributes(changes, callback);
  } else {
    return callback(null);
  }
};

Account.prototype.destroyEverything = function(callback) {
  return async.series([
    (function(_this) {
      return function(cb) {
        return _this.destroy(cb);
      };
    })(this), (function(_this) {
      return function(cb) {
        return Mailbox.destroyByAccount(_this.id, cb);
      };
    })(this), (function(_this) {
      return function(cb) {
        return Message.safeDestroyByAccountID(_this.id, cb);
      };
    })(this)
  ], callback);
};

Account.prototype.toClientObject = function(callback) {
  var rawObject;
  rawObject = this.toObject();
  return Mailbox.getClientTree(this.id, function(err, mailboxes) {
    if (err) {
      return callback(err);
    }
    if (rawObject.favorites == null) {
      rawObject.favorites = [];
    }
    rawObject.mailboxes = mailboxes;
    return callback(null, rawObject);
  });
};

Account.clientList = function(callback) {
  return Account.request('all', function(err, accounts) {
    if (err) {
      return callback(err);
    }
    return async.map(accounts, function(account, cb) {
      return account.toClientObject(cb);
    }, callback);
  });
};

Account.prototype.imap_getBoxes = function(callback) {
  log.debug("getBoxes");
  return this.doASAP(function(imap, cb) {
    return imap.getBoxesArray(cb);
  }, function(err, boxes) {
    return callback(err, boxes || []);
  });
};

Account.prototype.imap_refreshBoxes = function(callback) {
  var account;
  log.debug("imap_refreshBoxes");
  account = this;
  return async.parallel([
    (function(_this) {
      return function(cb) {
        return Mailbox.getBoxes(_this.id, cb);
      };
    })(this), (function(_this) {
      return function(cb) {
        return _this.imap_getBoxes(cb);
      };
    })(this)
  ], function(err, results) {
    var boxToAdd, cozyBox, cozyBoxes, imapBoxes, toDestroy, toFetch, _i, _len;
    log.debug("refreshBoxes#results", results);
    if (err) {
      return callback(err);
    }
    cozyBoxes = results[0], imapBoxes = results[1];
    toFetch = [];
    toDestroy = [];
    boxToAdd = imapBoxes.filter(function(box) {
      return !_.findWhere(cozyBoxes, {
        path: box.path
      });
    });
    for (_i = 0, _len = cozyBoxes.length; _i < _len; _i++) {
      cozyBox = cozyBoxes[_i];
      if (_.findWhere(imapBoxes, {
        path: cozyBox.path
      })) {
        toFetch.push(cozyBox);
      } else {
        toDestroy.push(cozyBox);
      }
    }
    log.debug("refreshBoxes#results2");
    return async.eachSeries(boxToAdd, function(box, cb) {
      log.debug("refreshBoxes#creating", box.label);
      box.accountID = account.id;
      return Mailbox.create(box, function(err, created) {
        if (err) {
          return cb(err);
        }
        toFetch.push(created);
        return cb(null);
      });
    }, function(err) {
      if (err) {
        return callback(err);
      }
      return callback(null, toFetch, toDestroy);
    });
  });
};

Account.prototype.imap_fetchMails = function(limitByBox, onlyFavorites, callback) {
  var account;
  if (onlyFavorites == null) {
    onlyFavorites = false;
  }
  log.debug("account#imap_fetchMails", limitByBox, onlyFavorites);
  account = this;
  return this.imap_refreshBoxes(function(err, toFetch, toDestroy) {
    var reporter;
    if (onlyFavorites) {
      toFetch = toFetch.filter(function(box) {
        var _ref;
        return _ref = box.id, __indexOf.call(account.favorites, _ref) >= 0;
      });
    }
    log.info("FETCHING ACCOUNT ", this.label, ":", toFetch.length, "BOXES");
    log.info("   ", toDestroy.length, "BOXES TO DESTROY");
    reporter = ImapReporter.accountFetch(this, toFetch.length + 1);
    toFetch.sort(function(a, b) {
      if (a.label === 'INBOX') {
        return 1;
      } else {
        return -1;
      }
    });
    return async.eachSeries(toFetch, function(box, cb) {
      return box.imap_fetchMails(limitByBox, function(err) {
        if (err) {
          reporter.onError(err);
        }
        reporter.addProgress(1);
        return cb(null);
      });
    }, function(err) {
      if (err) {
        return callback(err);
      }
      log.debug("account#imap_fetchMails#DONE");
      return async.eachSeries(toDestroy, function(box, cb) {
        return box.destroyAndRemoveAllMessages(cb);
      }, function(err) {
        reporter.onDone();
        return callback(null);
      });
    });
  });
};

Account.prototype.imap_fetchMailsTwoSteps = function(callback) {
  log.debug("account#imap_fetchMails2Steps");
  return this.imap_fetchMails(100, true, (function(_this) {
    return function(err) {
      if (err) {
        return callback(err);
      }
      return _this.imap_fetchMails(null, false, function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null);
      });
    };
  })(this));
};

Account.prototype.imap_createMail = function(box, message, callback) {
  var mailbuilder;
  mailbuilder = new Compiler(message).compile();
  return mailbuilder.build((function(_this) {
    return function(err, buffer) {
      if (err) {
        return callback(err);
      }
      return _this.doASAP(function(imap, cb) {
        return imap.append(buffer, {
          mailbox: box.path,
          flags: message.flags
        }, cb);
      }, function(err, uid) {
        if (err) {
          return callback(err);
        }
        return callback(null, uid);
      });
    };
  })(this));
};

Account.prototype.imap_scanBoxesForSpecialUse = function(boxes, callback) {
  var box, boxAttributes, id, inboxMailbox, priorities, type, useRFC6154, _i, _j, _len, _len1, _ref;
  useRFC6154 = false;
  inboxMailbox = null;
  boxAttributes = Object.keys(Mailbox.RFC6154);
  boxes.map((function(_this) {
    return function(box) {
      var attribute, type, _i, _len;
      if (box.isInbox()) {
        inboxMailbox = box.id;
      } else if (type = box.RFC6154use()) {
        if (!useRFC6154) {
          useRFC6154 = true;
          for (_i = 0, _len = boxAttributes.length; _i < _len; _i++) {
            attribute = boxAttributes[_i];
            _this[attribute] = null;
          }
        }
        log.debug('found', type);
        _this[type] = box.id;
      } else if (!useRFC6154 && (type = box.guessUse())) {
        log.debug('found', type, 'guess');
        _this[type] = box.id;
      }
      return box;
    };
  })(this));
  priorities = ['inboxMailbox', 'allMailbox', 'sentMailbox', 'draftMailbox'];
  this.inboxMailbox = inboxMailbox;
  this.favorites = [];
  for (_i = 0, _len = priorities.length; _i < _len; _i++) {
    type = priorities[_i];
    if (id = this[type]) {
      this.favorites.push(id);
    }
  }
  for (_j = 0, _len1 = boxes.length; _j < _len1; _j++) {
    box = boxes[_j];
    if (this.favorites.length < 4) {
      if ((_ref = box.id, __indexOf.call(this.favorites, _ref) < 0) && __indexOf.call(box.attribs, '\\NoSelect') < 0) {
        this.favorites.push(box.id);
      }
    }
  }
  return this.save(callback);
};

Account.prototype.sendMessage = function(message, callback) {
  var transport;
  if (this.isTest()) {
    return callback(null, {
      messageId: 66
    });
  }
  transport = nodemailer.createTransport({
    port: this.smtpPort,
    host: this.smtpServer,
    secure: this.smtpSSL,
    ignoreTLS: !this.smtpTLS,
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user: this.login,
      pass: this.password
    }
  });
  return transport.sendMail(message, callback);
};

Account.prototype.testSMTPConnection = function(callback) {
  var auth, connection, reject, timeout;
  if (this.isTest()) {
    return callback(null);
  }
  reject = _.once(callback);
  connection = new SMTPConnection({
    port: this.smtpPort,
    host: this.smtpServer,
    secure: this.smtpSSL,
    ignoreTLS: !this.smtpTLS,
    tls: {
      rejectUnauthorized: false
    }
  });
  auth = {
    user: this.login,
    pass: this.password
  };
  connection.once('error', function(err) {
    log.warn("SMTP CONNECTION ERROR", err);
    return reject(new AccountConfigError('smtpServer'));
  });
  timeout = setTimeout(function() {
    reject(new AccountConfigError('smtpPort'));
    return connection.close();
  }, 10000);
  return connection.connect(function(err) {
    if (err) {
      return reject(new AccountConfigError('smtpServer'));
    }
    clearTimeout(timeout);
    return connection.login(auth, function(err) {
      if (err) {
        reject(new AccountConfigError('auth'));
      } else {
        callback(null);
      }
      return connection.close();
    });
  });
};
