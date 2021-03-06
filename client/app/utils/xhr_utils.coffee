request = require 'superagent'
_       = require 'underscore'

AccountTranslator = require './translators/account_translator'

SettingsStore = require '../stores/settings_store'


handleResponse = (callback, details...) ->
    # Prepare the handler to get `err`, `res` from superagent, and next the
    # contextual args (callback, details...)
    _handler = (err, res, callback, details) ->
        if err or not res.ok
            unless err
                if res.body?.error is true
                    err = res.body
                else if res.body?.error
                    err = res.body.error
                else if res.body
                    err = res.body
                else
                    err = new Error "error in #{details[0]}"

            console.error "Error in", details..., err
            callback err

        else
            callback null, res.body

    # Returns a partial ready to be used by superagent `end`, with placeholders
    _.partial _handler, _, _, callback, details


module.exports =
    changeSettings: (settings, callback) ->
        request.put "settings"
        .set 'Accept', 'application/json'
        .send settings
        .end handleResponse callback, 'changeSettings', settings

    fetchMessage: (emailID, callback) ->
        request.get "message/#{emailID}"
        .set 'Accept', 'application/json'
        .end handleResponse callback, 'fetchMessage', emailID

    fetchConversation: (conversationID, callback) ->
        request.get "messages/batchFetch?conversationID=#{conversationID}"
        .set 'Accept', 'application/json'
        .end (err, res) ->
            _cb = handleResponse(callback, 'fetchConversation', conversationID)
            if res.ok
                res.body.conversationLengths = {}
                res.body.conversationLengths[conversationID] = res.body.length
            _cb(err, res)


    fetchMessagesByFolder: (url, callback) ->
        request.get url
        .set 'Accept', 'application/json'
        .end handleResponse callback, "fetchMessagesByFolder", url

    mailboxCreate: (mailbox, callback) ->
        request.post "mailbox"
        .send mailbox
        .set 'Accept', 'application/json'
        .end handleResponse callback, "mailboxCreate", mailbox

    mailboxUpdate: (data, callback) ->
        request.put "mailbox/#{data.mailboxID}"
        .send data
        .set 'Accept', 'application/json'
        .end handleResponse callback, "mailboxUpdate", data

    mailboxDelete: (data, callback) ->
        request.del "mailbox/#{data.mailboxID}"
        .set 'Accept', 'application/json'
        .end handleResponse callback, "mailboxDelete", data

    mailboxExpunge: (data, callback) ->
        request.del "mailbox/#{data.mailboxID}/expunge"
        .set 'Accept', 'application/json'
        .end handleResponse callback, "mailboxExpunge", data

    messageSend: (message, callback) ->
        req = request.post "message"
        .set 'Accept', 'application/json'

        files = {}
        message.attachments = message.attachments.map (file) ->
            files[file.get('generatedFileName')] = file.get 'rawFileObject'
            return file.remove 'rawFileObject'
        .toJS()

        req.field 'body', JSON.stringify message
        for name, blob of files
            if blob?
                req.attach name, blob

        req.end handleResponse callback, "messageSend", message


    batchFetch: (target, callback) ->
        body = _.extend {}, target
        request.put "messages/batchFetch"
        .send target
        .end handleResponse callback, "batchFetch"

    batchAddFlag: (target, flag, callback) ->
        body = _.extend {flag}, target
        request.put "messages/batchAddFlag"
        .send body
        .end handleResponse callback, "batchAddFlag"

    batchRemoveFlag: (target, flag, callback) ->
        body = _.extend {flag}, target
        request.put "messages/batchRemoveFlag"
        .send body
        .end handleResponse callback, "batchRemoveFlag"

    batchDelete: (target, callback) ->
        body = _.extend {}, target
        request.put "messages/batchTrash"
        .send target
        .end handleResponse callback, "batchDelete"

    batchMove: (target, from, to, callback) ->
        body = _.extend {from, to}, target
        request.put "messages/batchMove"
        .send body
        .end handleResponse callback, "batchMove"

    createAccount: (account, callback) ->
        # TODO: validation & sanitization
        request.post 'account'
        .send account
        .set 'Accept', 'application/json'
        .end handleResponse callback, "createAccount", account

    editAccount: (account, callback) ->

        # TODO: validation & sanitization
        rawAccount = account.toJS()

        request.put "account/#{rawAccount.id}"
        .send rawAccount
        .set 'Accept', 'application/json'
        .end handleResponse callback, "editAccount", account

    checkAccount: (account, callback) ->
        request.put "accountUtil/check"
        .send account
        .set 'Accept', 'application/json'
        .end handleResponse callback, "checkAccount"

    removeAccount: (accountID, callback) ->

        request.del "account/#{accountID}"
        .set 'Accept', 'application/json'
        .end handleResponse callback, "removeAccount"

    accountDiscover: (domain, callback) ->

        request.get "provider/#{domain}"
        .set 'Accept', 'application/json'
        .end handleResponse callback, "accountDiscover"

    search: (url, callback) ->
        request.get url
        .set 'Accept', 'application/json'
        .end handleResponse callback, "search"

    refresh: (hard, callback) ->
        url = if hard then "refresh?all=true"
        else "refresh"

        request.get url
        .end handleResponse callback, "refresh"

    refreshMailbox: (mailboxID, opts, callback) ->
        request.get "refresh/#{mailboxID}"
        .query opts
        .end handleResponse callback, "refreshMailbox"


    activityCreate: (options, callback) ->
        request.post "activity"
        .send options
        .set 'Accept', 'application/json'
        .end handleResponse callback, "activityCreate", options
