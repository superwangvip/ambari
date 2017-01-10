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
require('views/main/admin/stack_upgrade/upgrade_history_view');

describe('App.MainAdminStackUpgradeHistoryView', function () {
  var view;

  beforeEach(function () {
    view = App.MainAdminStackUpgradeHistoryView.create();
  });

  afterEach(function () {
    view.destroy();
  });

  describe("#filterBy()", function () {
    var records = [
        Em.Object.create({
          requestStatus: "ABORTED",
          direction: "UPGRADE"
        }),
        Em.Object.create({
          requestStatus: "ABORTED",
          direction: "DOWNGRADE"
        }),
        Em.Object.create({
          requestStatus: "COMPLETED",
          direction: "UPGRADE"
        }),
        Em.Object.create({
          requestStatus: "COMPLETED",
          direction: "DOWNGRADE"
        })
      ];


    beforeEach(function () {
      this.mock = sinon.stub(App.StackUpgradeHistory, 'find');
    });

    afterEach(function () {
      this.mock.restore();
    });

    it('All should return all records', function(){
      this.mock.returns(records);
      var filteredResults = view.filterBy('ALL');
      expect(filteredResults).to.have.property('length').equal(4);
    });

    it('Filter aborted upgrades', function(){
      this.mock.returns(records);
      var filteredResults = view.filterBy('UPGRADE_ABORTED');
      expect(filteredResults).to.have.property('length').equal(1);
    });

    it('Filter completed upgrades', function(){
      this.mock.returns(records);
      var filteredResults = view.filterBy('UPGRADE_COMPLETED');
      expect(filteredResults).to.have.property('length').equal(1);
    });

    it('Filter aborted downgrades', function(){
      this.mock.returns(records);
      var filteredResults = view.filterBy('DOWNGRADE_ABORTED');
      expect(filteredResults).to.have.property('length').equal(1);
    });

    it('Filter completed downgrades', function(){
      this.mock.returns(records);
      var filteredResults = view.filterBy('DOWNGRADE_COMPLETED');
      expect(filteredResults).to.have.property('length').equal(1);
    });
  });

  describe("#didInsertElement()", function() {
    beforeEach(function () {
      sinon.stub(view, 'observesCategories', Em.K);
    });
    afterEach(function () {
      view.observesCategories.restore();
    });
    it("observesCategories is called once", function() {
      view.didInsertElement();
      expect(view.observesCategories.calledOnce).to.be.true;
    });
  });

  describe("#observesCategories()", function () {
    var mock = {format: Em.K};
    beforeEach(function () {
      sinon.stub(Em.I18n, 't').returns(mock);
      sinon.stub(mock, 'format').returns('label');
      sinon.stub(view, 'filterBy').returns([]);
      view.set('categories', [
        Em.Object.create({
          labelKey: 'labelKey',
          value: 'value',
          isSelected: false
        })
      ]);
      view.observesCategories();
    });
    afterEach(function () {
      Em.I18n.t.restore();
      mock.format.restore();
      view.filterBy.restore();
    });
    it("categories[0].label is updated", function () {
      expect(view.get('categories')[0].get('label')).to.equal('label');
    });
  });

  describe("#selectCategory()", function() {
    var event;
    beforeEach(function () {
      event = {
        context: Em.Object.create({
          isSelected: false,
          value: 'ALL',
        })
      };
      view.set('categories', [
        Em.Object.create({
          isSelected: true,
          value: 'UPGRADE_COMPLETED',
        }),
        event.context
      ]);
      view.selectCategory(event);
    });

    it("categories[0].isSelected false", function() {
      expect(view.get('categories')[0].get('isSelected')).to.be.false;
    });
    it("isSelected is true", function() {
      expect(event.context.get('isSelected')).to.be.true;
    });
  });

  describe("#willInsertElement()", function() {
    beforeEach(function () {
      sinon.spy(view.get('controller'), 'loadStackUpgradeHistoryToModel');
    });
    afterEach(function () {
      view.get('controller').loadStackUpgradeHistoryToModel.restore();
    });
    it("load data by controller is called once", function() {
      view.willInsertElement();
      expect(view.get('controller').loadStackUpgradeHistoryToModel.calledOnce).to.be.true;
    });
  });
});
