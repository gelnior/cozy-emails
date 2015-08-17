// Generated by CoffeeScript 1.9.0
var Acccount, Mailbox, Message, Scheduler, SocketHandler, forgetClient, handleNewClient, inScope, io, ioServer, log, processSummaryCooldown, ramStore, sockets, stream, updateClientScope, _,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

log = require('../utils/logging')('sockethandler');

ioServer = require('socket.io');

ramStore = require('../models/store_account_and_boxes');

Scheduler = require('../processes/_scheduler');

stream = require('stream');

_ = require('lodash');

Acccount = require('../models/account');

Mailbox = require('../models/mailbox');

Message = require('../models/message');

io = null;

sockets = [];

processSummaryCooldown = null;

SocketHandler = exports;

SocketHandler.setup = function(app, server) {
  io = ioServer(server);
  io.on('connection', handleNewClient);
  Acccount.on('create', function(created) {
    created = ramStore.getAccountClientObject(created.id);
    return io.emit('account.create', created);
  });
  Acccount.on('update', function(updated, old) {
    updated = ramStore.getAccountClientObject(updated.id);
    return io.emit('account.update', updated, old);
  });
  Acccount.on('delete', function(id, deleted) {
    return io.emit('account.delete', id, deleted);
  });
  Mailbox.on('create', function(created) {
    created = ramStore.getMailboxClientObject(created.id);
    return io.emit('mailbox.create', created);
  });
  Mailbox.on('update', function(updated, old) {
    updated = ramStore.getMailboxClientObject(updated.id);
    return io.emit('mailbox.update', updated, old);
  });
  Mailbox.on('delete', function(id, deleted) {
    return io.emit('mailbox.delete', id, deleted);
  });
  Message.on('create', function(created) {
    var socket, _i, _len, _results;
    created = created.toClientObject();
    io.emit('message.create', created);
    _results = [];
    for (_i = 0, _len = sockets.length; _i < _len; _i++) {
      socket = sockets[_i];
      if (inScope(socket, created)) {
        _results.push(socket.emit('message.create', created));
      }
    }
    return _results;
  });
  Message.on('update', function(updated, old) {
    var socket, _i, _len, _results;
    updated = updated.toClientObject();
    io.emit('message.update', updated, old);
    _results = [];
    for (_i = 0, _len = sockets.length; _i < _len; _i++) {
      socket = sockets[_i];
      if (inScope(socket, updated) || inScope(socket, old)) {
        _results.push(socket.emit('message.update', updated));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  });
  Message.on('delete', function(id, deleted) {
    return io.emit('message.delete', id, deleted);
  });
  return Scheduler.on('change', function() {
    if (processSummaryCooldown) {
      return true;
    } else {
      io.emit('refresh.update', Scheduler.clientSummary());
      processSummaryCooldown = true;
      return setTimeout((function() {
        return processSummaryCooldown = false;
      }), 500);
    }
  });
};

inScope = function(socket, data) {
  var _ref;
  log.debug("inscope", socket.scope_mailboxID, Object.keys(data.mailboxIDs));
  return (_ref = socket.scope_mailboxID, __indexOf.call(Object.keys(data.mailboxIDs), _ref) >= 0) && socket.scope_before < data.date;
};

handleNewClient = function(socket) {
  log.debug('handleNewClient', socket.id);
  socket.emit('refreshes.status', Scheduler.clientSummary());
  socket.on('change_scope', function(scope) {
    return updateClientScope(socket, scope);
  });
  socket.on('disconnect', function() {
    return forgetClient(socket);
  });
  return sockets.push(socket);
};

updateClientScope = function(socket, scope) {
  log.debug('updateClientScope', socket.id, scope);
  socket.scope_before = new Date(scope.before || 0);
  return socket.scope_mailboxID = scope.mailboxID;
};

forgetClient = function(socket) {
  var index;
  log.debug("forgetClient", socket.id);
  index = sockets.indexOf(socket);
  if (index !== -1) {
    return sockets = sockets.splice(index, 1);
  }
};
