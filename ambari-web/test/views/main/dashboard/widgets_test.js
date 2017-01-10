/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var App = require('app');
require('messages');
require('mixins/common/userPref');
require('mixins/common/localStorage');
require('views/main/dashboard/widgets');

describe('App.MainDashboardWidgetsView', function () {

  var view;

  beforeEach(function() {
    view = App.MainDashboardWidgetsView.create({
      getUserPref: Em.K,
      postUserPref: Em.K,
      setDBProperty: Em.K,
      persistKey: 'key'
    });
  });

  describe('#didInsertElement()', function() {

    beforeEach(function() {
      sinon.stub(view, 'loadWidgetsSettings').returns({
        complete: Em.clb
      });
      sinon.stub(view, 'checkServicesChange');
      sinon.stub(view, 'renderWidgets');
      sinon.stub(Em.run, 'next');
      view.didInsertElement();
    });

    afterEach(function() {
      view.loadWidgetsSettings.restore();
      view.checkServicesChange.restore();
      view.renderWidgets.restore();
      Em.run.next.restore();
    });

    it('checkServicesChange should be called', function() {
      expect(view.checkServicesChange).to.be.calledOnce;
    });

    it('renderWidgets should be called', function() {
      expect(view.renderWidgets).to.be.calledOnce;
    });

    it('isDataLoaded should be true', function() {
      expect(view.get('isDataLoaded')).to.be.true;
    });

    it('Em.run.next should be called', function() {
      expect(Em.run.next.calledWith(view, 'makeSortable')).to.be.true;
    });
  });

  describe('#loadWidgetsSettings()', function() {

    beforeEach(function() {
      sinon.spy(view, 'getUserPref');
    });

    afterEach(function() {
      view.getUserPref.restore();
    });

    it('getUserPref should be called', function() {
      view.loadWidgetsSettings();
      expect(view.getUserPref.calledWith('key')).to.be.true;
    });
  });

  describe('#saveWidgetsSettings()', function() {

    beforeEach(function() {
      sinon.stub(view, 'setDBProperty');
      sinon.stub(view, 'postUserPref');
      view.saveWidgetsSettings({settings:{}});
    });

    afterEach(function() {
      view.setDBProperty.restore();
      view.postUserPref.restore();
    });

    it('setDBProperty should be called', function() {
      expect(view.setDBProperty.calledWith('key', {settings:{}})).to.be.true;
    });

    it('postUserPref should be called', function() {
      expect(view.postUserPref.calledWith('key', {settings:{}})).to.be.true;
    });

    it('userPreferences should be set', function() {
      expect(view.get('userPreferences')).to.be.eql({settings:{}});
    });
  });

  describe('#getUserPrefSuccessCallback()', function() {

    beforeEach(function() {
      sinon.stub(view, 'getUserPrefErrorCallback');
    });

    afterEach(function() {
      view.getUserPrefErrorCallback.restore();
    });

    it('getUserPrefErrorCallback should be called', function() {
      view.getUserPrefSuccessCallback(null);
      expect(view.getUserPrefErrorCallback).to.be.calledOnce;
    });

    it('userPreferences should be set', function() {
      view.getUserPrefSuccessCallback({settings:{}});
      expect(view.get('userPreferences')).to.be.eql({settings:{}});
    });
  });

  describe('#getUserPrefErrorCallback()', function() {

    beforeEach(function() {
      sinon.stub(view, 'generateDefaultUserPreferences').returns({settings:{}});
      sinon.stub(view, 'saveWidgetsSettings');
    });

    afterEach(function() {
      view.generateDefaultUserPreferences.restore();
      view.saveWidgetsSettings.restore();
    });

    it('saveWidgetsSettings should be called', function() {
      view.getUserPrefErrorCallback();
      expect(view.saveWidgetsSettings.calledWith({settings:{}})).to.be.true;
    });
  });

  describe('#resolveConfigDependencies()', function() {

    beforeEach(function() {
      this.mock = sinon.stub(App.router, 'get');
    });

    afterEach(function() {
      App.router.get.restore();
    });

    it('isHiddenByDefault should be undefined', function() {
      var widgets = [{id: 20}];
      this.mock.returns({properties: {'hide_yarn_memory_widget': 'false'}});
      view.resolveConfigDependencies(widgets);
      expect(widgets[0].isHiddenByDefault).to.be.undefined;
    });

    it('isHiddenByDefault should be true', function() {
      var widgets = [{id: 20}];
      this.mock.returns({properties: {'hide_yarn_memory_widget': 'true'}});
      view.resolveConfigDependencies(widgets);
      expect(widgets[0].isHiddenByDefault).to.be.true;
    });
  });

  describe('#generateDefaultUserPreferences', function() {

    beforeEach(function() {
      sinon.stub(view, 'resolveConfigDependencies');
      sinon.stub(App.Service, 'find').returns(Em.Object.create());
      view.set('widgetsDefinition', [
        Em.Object.create({sourceName: 'S1', id: 1}),
        Em.Object.create({sourceName: 'HOST_METRICS', id: 2, isHiddenByDefault: true, threshold: []}),
        Em.Object.create({sourceName: 'HOST_METRICS', id: 3, threshold: [1, 2]})
      ]);
    });

    afterEach(function() {
      view.resolveConfigDependencies.restore();
      App.Service.find.restore();
    });

    it('should generate default preferences', function() {
      expect(JSON.stringify(view.generateDefaultUserPreferences())).to.be.eql(JSON.stringify({
        "visible": [3],
        "hidden": [2],
        "threshold": {
          "2": [],
          "3": [1,2]
        }
      }));
      expect(view.resolveConfigDependencies).to.be.calledOnce;
    });
  });

  describe('#renderWidgets()', function() {

    it('should set visibleWidgets and hiddenWidgets', function() {
      view.set('userPreferences', {
        visible: [1],
        hidden: [2],
        threshold: {
          1: [],
          2: [1,2]
        }
      });
      view.renderWidgets();
      expect(view.get('visibleWidgets')).to.be.eql([Em.Object.create({
        id: 1,
        threshold: [],
        viewClass: App.NameNodeHeapPieChartView,
        sourceName: 'HDFS',
        title: Em.I18n.t('dashboard.widgets.NameNodeHeap')
      })]);
      expect(view.get('hiddenWidgets')).to.be.eql([
        Em.Object.create({
          id: 2,
          title: Em.I18n.t('dashboard.widgets.HDFSDiskUsage'),
          checked: false
        })
      ]);
    });
  });

  describe('#checkServicesChange()', function() {

    beforeEach(function() {
      sinon.stub(view, 'generateDefaultUserPreferences').returns({
        visible: [1, 2],
        hidden: [3, 4]
      });
      sinon.stub(view, 'saveWidgetsSettings');
    });

    afterEach(function() {
      view.generateDefaultUserPreferences.restore();
      view.saveWidgetsSettings.restore();
    });

    it('userPreferences should be updated', function() {
      view.set('userPreferences', {
        visible: [3],
        hidden: [1],
        threshold: {}
      });
      view.checkServicesChange();
      expect(view.saveWidgetsSettings.getCall(0).args[0]).to.be.eql({
        visible: [3, 2],
        hidden: [1, 4],
        threshold: {}
      });
    });
  });

  describe('#resetAllWidgets()', function() {

    beforeEach(function() {
      sinon.stub(App, 'showConfirmationPopup', Em.clb);
      sinon.stub(view, 'generateDefaultUserPreferences').returns({settings: {}});
      sinon.stub(view, 'saveWidgetsSettings');
      sinon.stub(view, 'renderWidgets');
      view.resetAllWidgets();
    });

    afterEach(function() {
      App.showConfirmationPopup.restore();
      view.generateDefaultUserPreferences.restore();
      view.saveWidgetsSettings.restore();
      view.renderWidgets.restore();
    });

    it('saveWidgetsSettings should be called', function() {
      expect(view.saveWidgetsSettings.calledWith({settings: {}})).to.be.true;
    });

    it('renderWidgets should be called', function() {
      expect(view.renderWidgets).to.be.calledOnce;
    });

    it('properties should be reset', function() {
      expect(view.get('currentTimeRangeIndex')).to.be.equal(0);
      expect(view.get('customStartTime')).to.be.null;
      expect(view.get('customEndTime')).to.be.null;
    });
  });

  describe('#plusButtonFilterView', function() {
    var plusButtonFilterView;

    beforeEach(function() {
      plusButtonFilterView = view.get('plusButtonFilterView').create({
        parentView: Em.Object.create({
          saveWidgetsSettings: Em.K,
          renderWidgets: Em.K
        })
      });
    });

    describe('#applyFilter()', function() {

      beforeEach(function() {
        sinon.spy(plusButtonFilterView.get('parentView'), 'renderWidgets');
        sinon.spy(plusButtonFilterView.get('parentView'), 'saveWidgetsSettings');
        plusButtonFilterView.set('parentView.userPreferences', {
          visible: [2],
          hidden: [1, 3],
          threshold: {}
        });
        plusButtonFilterView.set('hiddenWidgets', [
          Em.Object.create({checked: true, id: 1})
        ]);
        plusButtonFilterView.applyFilter();
      });

      afterEach(function() {
        plusButtonFilterView.get('parentView').renderWidgets.restore();
        plusButtonFilterView.get('parentView').saveWidgetsSettings.restore();
      });

      it('saveWidgetsSettings should be called', function() {
        expect(plusButtonFilterView.get('parentView').saveWidgetsSettings.getCall(0).args[0]).to.be.eql({
          visible: [2, 1],
          hidden: [3],
          threshold: {}
        });
      });

      it('renderWidgets should be called', function() {
        expect(plusButtonFilterView.get('parentView').renderWidgets).to.be.calledOnce;
      });
    });
  });

});
