var assert = require('chai').assert

var mockeryUtils = require('./utils/mockery_utils')
var SpecDispatcher = require('./utils/specs_dispatcher')
var ActionTypes = require('../app/constants/app_constants').ActionTypes


describe('Layout Store', function() {

  var sandbox, layoutStore, dispatcher

  before(() => {
      dispatcher = new SpecDispatcher();
      mockeryUtils.initDispatcher(dispatcher);
      mockeryUtils.initForStores();
      layoutStore = require('../app/stores/layout_store');
  })

  describe('Actions', () => {
    it('TOASTS_SHOW', () => {
      dispatcher.dispatch({type: ActionTypes.TOASTS_SHOW});
      assert.equal(layoutStore.isToastHidden(), false);
    });
    it('TOASTS_HIDE', () => {
      dispatcher.dispatch({type: ActionTypes.TOASTS_HIDE});
      assert.equal(layoutStore.isToastHidden(), true);
    });
    it('INTENT_AVAILABLE', () => {
      dispatcher.dispatch({
        type: ActionTypes.INTENT_AVAILABLE,
        value: true
      });
      assert.equal(layoutStore.isIntentAvailable(), true);
    });
  });

  after(() => {
    mockeryUtils.clean()
  })

})
