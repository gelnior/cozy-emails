var assert = require('chai').assert
var Immutable = require('immutable')

var mockeryUtils = require('./utils/mockery_utils')
var SpecDispatcher = require('./utils/specs_dispatcher')
var ActionTypes = require('../app/constants/app_constants').ActionTypes


describe('Account Store', () => {

  var sandbox, accountStore, dispatcher
  var account1, account2, account3;

  function addAcount(account) {
    dispatcher.dispatch({
      type: ActionTypes.ADD_ACCOUNT_SUCCESS,
      value: {account},
    });
  }

  before(() => {
    dispatcher = new SpecDispatcher();
    mockeryUtils.initDispatcher(dispatcher);
    mockeryUtils.initForStores();
    accountStore = require('../app/stores/account_store');
  })

  before(() => {
    account1 = accountStore.makeEmptyAccount().toObject();
    account2 = accountStore.makeEmptyAccount().toObject();
    account3 = accountStore.makeEmptyAccount().toObject();
    account1.id = '123';
    account1.label = 'personal';
    account1.mailboxes = [
      {id: 'a1', label: 'inbox', attribs: '', tree: [''], accountID: '123'},
      {id: 'a2', label: 'sent', attribs: '', tree: [''], accountID: '123'},
    ];
    account2.id = '124';
    account2.label = 'pro';
    account2.mailboxes = [
      {id: 'b1', label: 'mailbox', attribs: '', tree: [''], accountID: '124'},
      {id: 'b2', label: 'folder1', attribs: '', tree: [''], accountID: '124'},
    ];
    account3.id = '125';
    addAcount(account1);
    addAcount(account2);
  });


  /*
   * Problem noticed:
   *
   * * Remove mailbox event doesn't do anything.
   * * getDefault can be used as getByMailbox.
   */
  describe('Actions', () => {
    it('ADD_ACCOUNT_SUCCESS', () => {
      dispatcher.dispatch({
        type: ActionTypes.ADD_ACCOUNT_SUCCESS,
        value: {account: {id: '125'}},
      });
      var accounts = accountStore.getAll();
      assert.equal(accounts.get('125').get('id'), '125');
      assert.deepEqual(accounts.get('125').get('mailboxes').toObject(), {});
    });
    it('EDIT_ACCOUNT_SUCCESS', () => {
      dispatcher.dispatch({
        type: ActionTypes.EDIT_ACCOUNT_SUCCESS,
        value: {rawAccount: {id: '125', login: 'cozy'}},
      });
      var accounts = accountStore.getAll();
      assert.equal(accounts.get('125').get('login'), 'cozy');
    });
    it('MAILBOX_CREATE_SUCCESS', () => {
      dispatcher.dispatch({
        type: ActionTypes.MAILBOX_CREATE_SUCCESS,
        value: {id: '125', login: 'cozy', initialized: true},
      });
      var accounts = accountStore.getAll();
      assert.equal(accounts.get('125').get('initialized'), true);
    });
    it('MAILBOX_UPDATE_SUCCESS', () => {
      dispatcher.dispatch({
        type: ActionTypes.MAILBOX_UPDATE_SUCCESS,
        value: {id: '125', login: 'cozy', password: 'pass', initialized: true},
      });
      var accounts = accountStore.getAll();
      assert.equal(accounts.get('125').get('password'), 'pass');
    });
    it.skip('REMOVE_ACCOUNT_SUCCESS', () => {
    });
    it('MAILBOX_DELETE_SUCCESS', () => {
      dispatcher.dispatch({
        type: ActionTypes.MAILBOX_DELETE_SUCCESS,
        value: {id: '125'},
      });
      var accounts = accountStore.getAll();
      assert.isUndefined(accounts.get('125').get('password'));
    });
    it('RECEIVE_MAILBOX_UPDATE', () => {
      dispatcher.dispatch({
        type: ActionTypes.RECEIVE_MAILBOX_UPDATE,
        value: {id: 'b1', label: 'mailbox-edited'},
      });
      var accounts = accountStore.getAll();
      var mailbox = accounts.get('124').get('mailboxes').get('b1');
      assert.equal(mailbox.get('label'), 'mailbox-edited');
    });
  });

  describe('Methods', () => {
    it.skip('_getMailboxIndex', () => {
    });
    it.skip('_setMailboxToImmutable', () => {
    });
    it.skip('_initialize', () => {
    })
    it.skip('_getByMailbox', () => {
    });
    it.skip('_updateMailbox', () => {
    });
    it.skip('_updateAccount', () => {
    });
    it('getByID', () => {
      var account = accountStore.getByID('124');
      assert.equal(account.get('id'), '124');
    });
    it('getByMailbox', () => {
      var account = accountStore.getByMailbox('b1');
      assert.equal(account.get('id'), '124');
    });
    it('getDefault', () => {
      var account = accountStore.getDefault();
      assert.equal(account.get('id'), '123');
    });
    it('getByLabel', () => {
      var account = accountStore.getByLabel('pro');
      assert.equal(account.get('id'), '124');
    });
    it('getAllMailboxes', () => {
      var mailboxes = accountStore.getAllMailboxes('124');
      assert.deepEqual(mailboxes.get('b1').toObject(),
        {id: 'b1', label: 'mailbox-edited',
         attribs: '', tree: [''], accountID: '124'}
      );
      assert.deepEqual(mailboxes.get('b2').toObject(),
        {id: 'b2', label: 'folder1', attribs: '', tree: [''], accountID: '124'}
      );
      var mailboxes = accountStore.getAllMailboxes();
      assert.isUndefined(mailboxes);
    });
    it('makeEmptyAccount', () => {
      var account = accountStore.makeEmptyAccount();
      assert.deepEqual(account.toObject(), {
        label: '',
        login: '',
        password: '',
        imapServer: '',
        imapLogin: '',
        smtpServer: '',
        label: '',
        id: null,
        smtpPort: 465,
        smtpSSL: true,
        smtpTLS: false,
        smtpMethod: 'PLAIN',
        imapPort: 993,
        imapSSL: true,
        imapTLS: false,
        accountType: 'IMAP',
        favoriteMailboxes: null,
      });
    });
  });

  after(() => {
    mockeryUtils.clean()
  })

})
