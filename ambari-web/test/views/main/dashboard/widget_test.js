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
require('views/main/dashboard/widget');

describe('App.DashboardWidgetView', function () {

  var view;

  beforeEach(function() {
    view = App.DashboardWidgetView.create({
      widget: Em.Object.create(),
      parentView: Em.Object.create({
        userPreferences: {},
        saveWidgetsSettings: Em.K,
        renderWidgets: Em.K
      })
    });
  });

  describe('#model', function() {

    beforeEach(function() {
      sinon.stub(view, 'findModelBySource').returns(Em.Object.create({
        serviceName: 'S1'
      }));
    });

    afterEach(function() {
      view.findModelBySource.restore();
    });

    it('sourceName is null', function() {
      view.set('widget.sourceName', null);
      view.propertyDidChange('model');
      expect(view.get('model')).to.be.empty;
    });

    it('sourceName is S1', function() {
      view.set('widget.sourceName', 'S1');
      view.propertyDidChange('model');
      expect(view.get('model')).to.not.be.empty;
    });
  });

  describe('#thresholdMin', function() {

    it('threshold is empty', function() {
      view.set('widget.threshold', null);
      expect(view.get('thresholdMin')).to.be.equal(0);
    });

    it('threshold is set', function() {
      view.set('widget.threshold', [1, 2]);
      expect(view.get('thresholdMin')).to.be.equal(1);
    });
  });

  describe('#thresholdMax', function() {

    it('threshold is empty', function() {
      view.set('widget.threshold', null);
      expect(view.get('thresholdMax')).to.be.equal(0);
    });

    it('threshold is set', function() {
      view.set('widget.threshold', [1, 2]);
      expect(view.get('thresholdMax')).to.be.equal(2);
    });
  });

  describe('#widgetConfig', function () {
    var widgetConfig;

    beforeEach(function() {
      widgetConfig = view.get('widgetConfig').create();
    });

    describe('#validateThreshold()', function () {

      beforeEach(function () {
        sinon.stub(widgetConfig, 'updateSlider');
      });

      afterEach(function () {
        widgetConfig.updateSlider.restore();
      });

      it('updateSlider should be called', function () {
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.updateSlider).to.be.called;
      });

      it('thresholdMin is empty', function () {
        widgetConfig.set('thresholdMin', '');
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.get('thresholdMinError')).to.be.true;
        expect(widgetConfig.get('thresholdMinErrorMessage')).to.be.equal(Em.I18n.t('admin.users.editError.requiredField'));
      });

      it('thresholdMin is NaN', function () {
        widgetConfig.set('thresholdMin', 'a');
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.get('thresholdMinError')).to.be.true;
        expect(widgetConfig.get('thresholdMinErrorMessage')).to.be.equal(Em.I18n.t('dashboard.widgets.error.invalid').format(0));
      });

      it('thresholdMin bigger than maxValue', function () {
        widgetConfig.set('thresholdMin', '1');
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.get('thresholdMinError')).to.be.true;
        expect(widgetConfig.get('thresholdMinErrorMessage')).to.be.equal(Em.I18n.t('dashboard.widgets.error.invalid').format(0));
      });

      it('thresholdMin less than 0', function () {
        widgetConfig.set('thresholdMin', '-1');
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.get('thresholdMinError')).to.be.true;
        expect(widgetConfig.get('thresholdMinErrorMessage')).to.be.equal(Em.I18n.t('dashboard.widgets.error.invalid').format(0));
      });

      it('thresholdMin bigger than thresholdMax', function () {
        widgetConfig.set('thresholdMin', '2');
        widgetConfig.set('thresholdMax', '1');
        widgetConfig.set('maxValue', 100);
        widgetConfig.validateThreshold('thresholdMin');
        expect(widgetConfig.get('thresholdMinError')).to.be.true;
        expect(widgetConfig.get('thresholdMinErrorMessage')).to.be.equal(Em.I18n.t('dashboard.widgets.error.smaller'));
      });
    });

    describe('#observeThreshMinValue()', function() {

      beforeEach(function() {
        sinon.stub(widgetConfig, 'validateThreshold');
      });
      afterEach(function() {
        widgetConfig.validateThreshold.restore();
      });

      it('validateThreshold should be called', function() {
        widgetConfig.observeThreshMinValue();
        expect(widgetConfig.validateThreshold.calledWith('thresholdMin')).to.be.true;
      });
    });

    describe('#observeThreshMaxValue()', function() {

      beforeEach(function() {
        sinon.stub(widgetConfig, 'validateThreshold');
      });
      afterEach(function() {
        widgetConfig.validateThreshold.restore();
      });

      it('validateThreshold should be called', function() {
        widgetConfig.observeThreshMaxValue();
        expect(widgetConfig.validateThreshold.calledWith('thresholdMax')).to.be.true;
      });
    });
  });

  describe('#didInsertElement()', function() {

    beforeEach(function() {
      sinon.stub(App, 'tooltip');
    });

    afterEach(function() {
      App.tooltip.restore();
    });

    it('App.tooltip should be called', function() {
      view.didInsertElement();
      expect(App.tooltip).to.be.calledOnce;
    });
  });

  describe('#findModelBySource()', function() {

    beforeEach(function() {
      sinon.stub(App.Service, 'find').returns(Em.Object.create({serviceName: 'S1'}));
      sinon.stub(App.HDFSService, 'find').returns(Em.Object.create({serviceName: 'HDFS'}));
      this.mockGet = sinon.stub(App, 'get');
    });

    afterEach(function() {
      App.Service.find.restore();
      App.HDFSService.find.restore();
      this.mockGet.restore();
    });

    it('source = HOST_METRICS', function() {
      this.mockGet.returns([{}]);
      expect(view.findModelBySource('HOST_METRICS')).to.be.eql([{}]);
    });

    it('source = S1', function() {
      expect(view.findModelBySource('S1')).to.be.eql(Em.Object.create({serviceName: 'S1'}));
    });

    it('source = HDFS', function() {
      expect(view.findModelBySource('HDFS')).to.be.eql(Em.Object.create({serviceName: 'HDFS'}));
    });
  });

  describe('#deleteWidget()', function() {

    beforeEach(function() {
      sinon.stub(view.get('parentView'), 'saveWidgetsSettings');
      sinon.stub(view.get('parentView'), 'renderWidgets');
      view.set('widget.id', 1);
      view.set('parentView.userPreferences', {
        visible: [1],
        hidden: [],
        threshold: []
      });
      view.deleteWidget();
    });

    afterEach(function() {
      view.get('parentView').saveWidgetsSettings.restore();
      view.get('parentView').renderWidgets.restore();
    });

    it('saveWidgetsSettings should be called', function() {
      expect(view.get('parentView').saveWidgetsSettings.getCall(0).args[0]).to.be.eql({
        visible: [],
        hidden: [1],
        threshold: []
      });
    });

    it('renderWidgets should be called', function() {
      expect(view.get('parentView').renderWidgets).to.be.calledOnce;
    });
  });

  describe('#editWidget()', function() {

    beforeEach(function() {
      sinon.stub(view, 'showEditDialog');
    });

    afterEach(function() {
      view.showEditDialog.restore();
    });

    it('showEditDialog should be called', function() {
      view.reopen({
        widgetConfig: Em.Object.extend()
      });
      view.editWidget();
      expect(view.showEditDialog).to.be.calledOnce;
    });
  });

  describe('#showEditDialog()', function() {

    beforeEach(function() {
      sinon.stub(App.ModalPopup, 'show');
    });

    afterEach(function() {
      App.ModalPopup.show.restore();
    });

    it('App.ModalPopup.show should be called', function() {
      view.showEditDialog();
      expect(App.ModalPopup.show).to.be.calledOnce;
    });
  });

});
