// Generated by CoffeeScript 1.7.1
var IGNORE_ATTRIBUTES, Mailbox, Promise, americano, _,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

americano = require('americano-cozy');

Promise = require('bluebird');

_ = require('lodash');

Mailbox = (function() {
  function Mailbox() {}

  return Mailbox;

})();

module.exports = Mailbox = americano.getModel('Mailbox', {
  accountID: String,
  label: String,
  path: String,
  tree: function(x) {
    return x;
  },
  uidvalidity: Number,
  persistentUIDs: Boolean,
  attribs: function(x) {
    return x;
  },
  children: function(x) {
    return x;
  }
});

Mailbox.RFC6154 = {
  draftMailbox: '\\Drafts',
  sentMailbox: '\\Sent',
  trashMailbox: '\\Trash',
  allMailbox: '\\All',
  spamMailbox: '\\Junk',
  flaggedMailbox: '\\Flagged'
};

Mailbox.getBoxes = function(accountID) {
  return Mailbox.rawRequestPromised('treeMap', {
    startkey: [accountID],
    endkey: [accountID, {}],
    include_docs: true
  }).map(function(row) {
    return new Mailbox(row.doc);
  }).filter(function(box) {
    return __indexOf.call(box.attribs, '\\Noselect') < 0;
  });
};

Mailbox.getTree = function(accountID, mapper) {
  var DELIMITER, byPath, out, transform;
  if (mapper == null) {
    mapper = null;
  }
  out = [];
  byPath = {};
  DELIMITER = '/|/';
  transform = function(boxData) {
    var box;
    box = new Mailbox(boxData);
    box.children = [];
    if (mapper) {
      return mapper(box);
    } else {
      return box;
    }
  };
  return Mailbox.rawRequestPromised('treeMap', {
    startkey: [accountID],
    endkey: [accountID, {}],
    include_docs: true
  }).each(function(row) {
    var box, parentPath, path;
    path = row.key.slice(1);
    box = byPath[path.join(DELIMITER)] = transform(row.doc);
    if (path.length === 1) {
      return out.push(box);
    } else {
      parentPath = path.slice(0, -1).join(DELIMITER);
      return byPath[parentPath].children.push(box);
    }
  })["return"](out);
};

Mailbox.getClientTree = function(accountID) {
  var filter;
  filter = function(box) {
    return _.pick(box, 'id', 'label', 'children');
  };
  return Mailbox.getTree(accountID, filter);
};

IGNORE_ATTRIBUTES = ['\\HasNoChildren', '\\HasChildren'];

Mailbox.createBoxesFromImapTree = function(accountID, tree) {
  var boxes, handleLevel, specialUses, specialUsesGuess, useRFC6154;
  boxes = [];
  (handleLevel = function(children, pathStr, pathArr) {
    var child, name, subPathArr, subPathStr, _results;
    _results = [];
    for (name in children) {
      child = children[name];
      subPathStr = pathStr + name + child.delimiter;
      subPathArr = pathArr.concat(name);
      handleLevel(child.children, subPathStr, subPathArr);
      _results.push(boxes.push(new Mailbox({
        accountID: accountID,
        label: name,
        path: pathStr + name,
        tree: subPathArr,
        attribs: _.difference(child.attribs, IGNORE_ATTRIBUTES)
      })));
    }
    return _results;
  })(tree, '', []);
  useRFC6154 = false;
  specialUses = {};
  specialUsesGuess = {};
  return Promise.serie(boxes, function(box) {
    return Mailbox.createPromised(box).then(function(jdbBox) {
      var attribute, field, path, _ref;
      if (jdbBox.path === 'INBOX') {
        specialUses['inboxMailbox'] = jdbBox.id;
        return jdbBox;
      }
      _ref = Mailbox.RFC6154;
      for (field in _ref) {
        attribute = _ref[field];
        if (__indexOf.call(jdbBox.attribs, attribute) >= 0) {
          if (!useRFC6154) {
            useRFC6154 = true;
          }
          specialUses[field] = jdbBox.id;
        }
      }
      if (!useRFC6154) {
        path = box.path.toLowerCase();
        if (0 === path.indexOf('sent')) {
          specialUsesGuess['sentMailbox'] = jdbBox.id;
        } else if (0 === path.indexOf('draft')) {
          specialUsesGuess['draftMailbox'] = jdbBox.id;
        } else if (0 === path.indexOf('flagged')) {
          specialUsesGuess['flaggedMailbox'] = jdbBox.id;
        } else if (0 === path.indexOf('trash')) {
          specialUsesGuess['trashMailbox'] = jdbBox.id;
        }
      }
      return jdbBox;
    });
  }).then(function(boxes) {
    var box, favorites, id, key, priorities, type, value, _i, _j, _len, _len1, _ref;
    favorites = [];
    priorities = ['inbox', 'all', 'sent', 'draft'];
    if (!useRFC6154) {
      for (key in specialUsesGuess) {
        value = specialUsesGuess[key];
        specialUses[key] = value;
      }
    }
    for (_i = 0, _len = priorities.length; _i < _len; _i++) {
      type = priorities[_i];
      if (id = specialUses[type + 'Mailbox']) {
        favorites.push(id);
      }
    }
    for (_j = 0, _len1 = boxes.length; _j < _len1; _j++) {
      box = boxes[_j];
      if (favorites.length < 4) {
        if ((_ref = box.id, __indexOf.call(favorites, _ref) < 0) && __indexOf.call(box.attribs, '\\NoSelect') < 0) {
          favorites.push(box.id);
        }
      }
    }
    return favorites;
  }).then(function(favorites) {
    specialUses.favorites = favorites;
    return specialUses;
  });
};

require('bluebird').promisifyAll(Mailbox, {
  suffix: 'Promised'
});

require('bluebird').promisifyAll(Mailbox.prototype, {
  suffix: 'Promised'
});
