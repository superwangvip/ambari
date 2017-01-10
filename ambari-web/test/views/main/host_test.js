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
require('views/main/host');

function getView() {
  return App.MainHostView.create({
    controller: App.MainHostController.create({
      updater: Em.Object.create({
        tableUpdaterMap: {
          'Hosts': 'updateHost'
        },
        updateHost: Em.K
      }),
      name: 'ctrl1'
    })
  });
}

describe('App.MainHostView', function () {

  var view;

  beforeEach(function () {
    view = getView();
  });

  App.TestAliases.testAsComputedAlias(getView(), 'colPropAssoc', 'controller.colPropAssoc', 'array');

  describe('#didInsertElement', function () {

    var cases = [
        {
          methodName: 'clearFiltersObs',
          propertyToChange: 'controller.clearFilters',
          callCount: 2
        },
        {
          methodName: 'toggleAllHosts',
          propertyToChange: 'selectAllHosts',
          callCount: 1
        },
        {
          methodName: 'updatePagination',
          propertyToChange: 'displayLength',
          callCount: 1
        },
        {
          methodName: 'updatePaging',
          propertyToChange: 'filteredCount',
          callCount: 2
        }
      ],
      title = '{0} changed';

    beforeEach(function () {
      cases.forEach(function (item) {
        sinon.stub(view, item.methodName, Em.K);
      });
    });

    afterEach(function () {
      cases.forEach(function (item) {
        view[item.methodName].restore();
      });
    });

    cases.forEach(function (item) {
      it(title.format(item.propertyToChange), function () {
        view.didInsertElement();
        view.propertyDidChange(item.propertyToChange);
        expect(view[item.methodName].callCount).to.equal(item.callCount);
      });
    });
  });

  describe("#onRequestErrorHandler()", function () {

    beforeEach(function () {
      sinon.stub(view, 'propertyDidChange');
      view.onRequestErrorHandler();
    });

    afterEach(function () {
      view.propertyDidChange.restore();
    });

    it("requestError should be null", function () {
      expect(view.get('requestError')).to.be.null;
    });

    it("filteringComplete should be true", function () {
      expect(view.get('filteringComplete')).to.be.true;
    });

    it("propertyDidChange should be called", function () {
      expect(view.propertyDidChange.calledWith('pageContent')).to.be.true;
    });
  });

  describe("#refresh()", function () {

    beforeEach(function () {
      sinon.stub(view.get('updater'), 'updateHost');
      view.refresh();
    });

    afterEach(function () {
      view.get('updater').updateHost.restore();
    });

    it("filteringComplete should be false", function () {
      expect(view.get('filteringComplete')).to.be.false;
    });

    it("updateHost should be called", function () {
      expect(view.get('updater').updateHost.calledOnce).to.be.true;
    });
  });

  describe("#resetFilterByColumns()", function () {

    beforeEach(function () {
      sinon.stub(view, 'saveFilterConditions');
    });

    afterEach(function () {
      view.saveFilterConditions.restore();
    });

    it("empty columns", function () {
      view.set('filterConditions', []);
      view.resetFilterByColumns([]);
      expect(view.saveFilterConditions.called).to.be.false;
    });

    it("empty filterConditions", function () {
      view.set('filterConditions', []);
      view.resetFilterByColumns([1]);
      expect(view.saveFilterConditions.called).to.be.false;
    });

    it("saveFilterConditions should be called", function () {
      view.set('filterConditions', [{
        iColumn: 1,
        type: 't1',
        skipFilter: false
      }]);
      view.resetFilterByColumns([1]);
      expect(view.saveFilterConditions.calledWith(1, '', 't1', false)).to.be.true;
    });
  });

  describe("#paginationLeftClass", function () {

    it("startIndex is 2, filteringComplete=true", function () {
      view.set('filteringComplete', true);
      view.set('startIndex', 2);
      expect(view.get('paginationLeftClass')).to.equal('paginate_previous');
    });

    it("startIndex is 2, filteringComplete=false", function () {
      view.set('filteringComplete', false);
      view.set('startIndex', 2);
      expect(view.get('paginationLeftClass')).to.equal('paginate_disabled_previous');
    });

    it("startIndex is 1, filteringComplete=true", function () {
      view.set('filteringComplete', true);
      view.set('startIndex', 1);
      expect(view.get('paginationLeftClass')).to.equal('paginate_disabled_previous');
    });

    it("startIndex is 0, filteringComplete=true", function () {
      view.set('filteringComplete', true);
      view.set('startIndex', 0);
      expect(view.get('paginationLeftClass')).to.equal('paginate_disabled_previous');
    });
  });

  describe("#paginationRightClass", function () {

    it("endIndex more than filteredCount, filteringComplete=true", function () {
      view.reopen({
        filteringComplete: true,
        endIndex: 4,
        filteredCount: 3
      });
      expect(view.get('paginationRightClass')).to.equal('paginate_disabled_next');
    });

    it("endIndex equal to filteredCount, filteringComplete=true", function () {
      view.reopen({
        filteringComplete: true,
        endIndex: 4,
        filteredCount: 4
      });
      expect(view.get('paginationRightClass')).to.equal('paginate_disabled_next');
    });

    it("endIndex less than filteredCount, filteringComplete=false", function () {
      view.reopen({
        filteringComplete: false,
        endIndex: 3,
        filteredCount: 4
      });
      view.propertyDidChange('paginationRightClass');
      expect(view.get('paginationRightClass')).to.equal('paginate_disabled_next');
    });

    it("endIndex less than filteredCount, filteringComplete=true", function () {
      view.reopen({
        filteringComplete: true,
        endIndex: 3,
        filteredCount: 4
      });
      view.propertyDidChange('paginationRightClass');
      expect(view.get('paginationRightClass')).to.equal('paginate_next');
    });
  });

  describe("#rowsPerPageSelectView", function () {
    var rowsPerPageSelectView;

    beforeEach(function () {
      rowsPerPageSelectView = view.get('rowsPerPageSelectView').create({
        parentView: Em.Object.create({
          dataView: {
            saveDisplayLength: Em.K,
            startIndex: 1
          }
        }),
        controller: Em.Object.create()
      });
    });

    describe("#disableView()", function () {

      beforeEach(function () {
        sinon.stub(Em.run, 'next', function (context, callback) {
          callback.apply(rowsPerPageSelectView);
        });
      });

      afterEach(function () {
        Em.run.next.restore();
      });

      it("disabled should be false", function () {
        rowsPerPageSelectView.set('parentView.dataView.filteringComplete', true);
        expect(rowsPerPageSelectView.get('disabled')).to.be.false;
      });
    });

    describe("#change()", function () {

      beforeEach(function () {
        sinon.stub(rowsPerPageSelectView.get('parentView.dataView'), 'saveDisplayLength');
        sinon.stub(Ember.run, 'next', Em.clb);
      });

      afterEach(function () {
        rowsPerPageSelectView.get('parentView.dataView').saveDisplayLength.restore();
        Ember.run.next.restore();
      });

      it("saveDisplayLength should be called", function () {
        rowsPerPageSelectView.change();
        expect(rowsPerPageSelectView.get('parentView.dataView').saveDisplayLength.calledOnce).to.be.true;
      });

      it("startIndex = 1", function () {
        rowsPerPageSelectView.set('parentView.dataView.startIndex', 1);
        rowsPerPageSelectView.change();
        expect(rowsPerPageSelectView.get('parentView.dataView.startIndex')).to.be.equal(1);
      });

      it("startIndex = 0", function () {
        rowsPerPageSelectView.set('parentView.dataView.startIndex', 0);
        rowsPerPageSelectView.change();
        expect(rowsPerPageSelectView.get('parentView.dataView.startIndex')).to.be.equal(0);
      });

      it("startIndex = 2", function () {
        rowsPerPageSelectView.set('parentView.dataView.startIndex', 2);
        rowsPerPageSelectView.change();
        expect(rowsPerPageSelectView.get('parentView.dataView.startIndex')).to.be.equal(1);
      });
    });
  });

  describe("#saveStartIndex()", function () {

    it("startIndex should be 10", function () {
      view.set('startIndex', 10);
      expect(view.get('controller.startIndex')).to.be.equal(10);
    });
  });

  describe("#clearFiltersObs()", function () {

    beforeEach(function() {
      sinon.stub(Em.run, 'next', Em.clb);
      sinon.stub(view, 'clearFilters');
    });

    afterEach(function() {
      Em.run.next.restore();
      view.clearFilters.restore();
    });

    it("clearFilters should not be called", function() {
      view.set('controller.clearFilters', false);
      view.clearFiltersObs();
      expect(view.clearFilters.called).to.be.false;
    });

    it("clearFilters should be called", function() {
      view.set('controller.clearFilters', true);
      view.clearFiltersObs();
      expect(view.clearFilters.calledOnce).to.be.true;
    });
  });

  describe("#willInsertElement()", function () {

    beforeEach(function() {
      sinon.stub(view, 'clearFilterConditionsFromLocalStorage').returns(true);
      sinon.stub(view, 'addObserver');
    });

    afterEach(function() {
      view.clearFilterConditionsFromLocalStorage.restore();
      view.addObserver.restore();
    });

    it("filterChangeHappened should be true", function() {
      view.set('controller.showFilterConditionsFirstLoad', false);
      view.willInsertElement();
      expect(view.get('controller.filterChangeHappened')).to.be.true;
    });

    it("startIndex should be 10", function() {
      view.set('controller.startIndex', 10);
      view.willInsertElement();
      expect(view.get('startIndex')).to.be.equal(10);
    });

    it("addObserver should be called", function() {
      view.willInsertElement();
      expect(view.addObserver.calledWith('pageContent.@each.selected', view, view.selectedHostsObserver)).to.be.true;
    });
  });

  describe("#willDestroyElement()", function () {
    var container = {
      remove: Em.K
    };

    beforeEach(function() {
      sinon.stub(container, 'remove');
      sinon.stub(window, '$').returns(container);
    });

    afterEach(function() {
      container.remove.restore();
      window.$.restore();
    });

    it("tooltip should be removed", function() {
      view.willDestroyElement();
      expect(container.remove.calledOnce).to.be.true;
    });
  });

  describe("#onInitialLoad()", function () {

    beforeEach(function() {
      sinon.stub(view, 'refresh');
      sinon.stub(view, 'propertyDidChange');
      view.set('tableFilteringComplete', true);
    });

    afterEach(function() {
      view.refresh.restore();
      view.propertyDidChange.restore();
    });

    it("filterChangeHappened should be false", function() {
      view.onInitialLoad();
      expect(view.get('controller.filterChangeHappened')).to.be.false;
    });

    it("refresh should be called", function() {
      view.set('controller.filterChangeHappened', true);
      view.onInitialLoad();
      expect(view.refresh.calledOnce).to.be.true;
    });

    it("propertyDidChange should be called", function() {
      view.set('controller.filterChangeHappened', false);
      view.onInitialLoad();
      expect(view.propertyDidChange.calledWith('filteringComplete')).to.be.true;
    });
  });

  describe("#toggleAllHosts()", function () {

    it("selected should be true", function() {
      var content = [Em.Object.create({selected: false})];
      view.reopen({
        selectAllHosts: true,
        pageContent: content
      });
      view.toggleAllHosts();
      expect(content[0].get('selected')).to.be.true;
    });
  });

  describe("#selectedHostsObserver()", function () {

    beforeEach(function() {
      sinon.stub(Ember.run, 'once');
    });

    afterEach(function() {
      Ember.run.once.restore();
    });

    it("Ember.run.once should be called", function() {
      view.selectedHostsObserver();
      expect(Ember.run.once.calledWith(view, 'updateCheckedFlags')).to.be.true;
    });
  });

  describe("#updateCheckedFlags()", function () {

    beforeEach(function() {
      sinon.stub(view, 'removeObserver');
      sinon.stub(view, 'combineSelectedFilter');
      sinon.stub(view, 'addObserver');
      sinon.stub(App.db, 'setSelectedHosts');
    });

    afterEach(function() {
      view.removeObserver.restore();
      view.combineSelectedFilter.restore();
      view.addObserver.restore();
      App.db.setSelectedHosts.restore();
    });

    it("removeObserver should be called", function() {
      view.updateCheckedFlags();
      expect(view.removeObserver.calledWith('selectAllHosts', view, view.toggleAllHosts)).to.be.true;
    });

    it("combineSelectedFilter should be called", function() {
      view.updateCheckedFlags();
      expect(view.combineSelectedFilter.calledOnce).to.be.true;
    });

    it("App.db.setSelectedHosts should be called", function() {
      view.set('selectedHosts', []);
      view.updateCheckedFlags();
      expect(App.db.setSelectedHosts.calledWith('ctrl1', [])).to.be.true;
    });

    it("addObserver should be called", function() {
      view.updateCheckedFlags();
      expect(view.addObserver.calledWith('selectAllHosts', view, view.toggleAllHosts)).to.be.true;
    });

    it("selectAllHosts should be false", function() {
      view.reopen({
        pageContent: []
      });
      view.updateCheckedFlags();
      expect(view.get('selectAllHosts')).to.be.false;
    });

    it("selectAllHosts should be true", function() {
      view.reopen({
        pageContent: [Em.Object.create({selected: true})]
      });
      view.updateCheckedFlags();
      expect(view.get('selectAllHosts')).to.be.true;
    });
  });

  describe("#combineSelectedFilter()", function () {

    beforeEach(function() {
      sinon.stub(App.db, 'getSelectedHosts').returns(['host2', 'host1']);
    });

    afterEach(function() {
      App.db.getSelectedHosts.restore();
    });

    it("selectedHosts should be set ", function() {
      view.reopen({
        pageContent: [
          Em.Object.create({selected: false, hostName: 'host1'}),
          Em.Object.create({selected: true, hostName: 'host3'})
        ]
      });
      view.combineSelectedFilter();
      expect(view.get('selectedHosts')).to.be.eql(['host3', 'host2']);
    });
  });

  describe("#filterSelected()", function () {

    beforeEach(function() {
      sinon.stub(view, 'updateFilter');
    });

    afterEach(function() {
      view.updateFilter.restore();
    });

    it("updateFilter should be called", function() {
      view.set('selectedHosts', ['host1']);
      view.filterSelected();
      expect(view.updateFilter.calledWith(10, ['host1'], 'multiple')).to.be.true;
    });
  });

  describe("#clearSelection()", function () {

    beforeEach(function() {
      sinon.stub(App.db, 'setSelectedHosts');
      sinon.stub(view, 'filterSelected');
      view.reopen({
        pageContent: [
          Em.Object.create({selected: true})
        ],
        selectAllHosts: true,
        selectedHosts: [{}]
      });
      view.clearSelection();
    });

    afterEach(function() {
      App.db.setSelectedHosts.restore();
      view.filterSelected.restore();
    });

    it("selected should be false", function() {
      expect(view.get('pageContent')[0].get('selected')).to.be.false;
    });

    it("selectAllHosts should be false", function() {
      expect(view.get('selectAllHosts')).to.be.false;
    });

    it("selectedHosts should be empty", function() {
      expect(view.get('selectedHosts')).to.be.empty;
    });

    it("App.db.setSelectedHosts should be called", function() {
      expect(App.db.setSelectedHosts.calledWith('ctrl1', [])).to.be.true;
    });

    it("filterSelected should be called", function() {
      expect(view.filterSelected.calledOnce).to.be.true;
    });
  });


  describe('#HostView', function () {

    var hostView;

    beforeEach(function () {
      hostView = view.HostView.create({
        content: {
          hostName: null
        },
        controller: App.MainHostController.create()
      });
    });

    describe("#didInsertElement()", function () {

      beforeEach(function() {
        sinon.stub(App, 'tooltip');
      });

      afterEach(function() {
        App.tooltip.restore();
      });

      it("App.tooltip should be called", function() {
        hostView.didInsertElement();
        expect(App.tooltip.calledOnce).to.be.true;
      });
    });

    describe("#willDestroyElement()", function () {
      var container = {
        remove: Em.K
      };

      beforeEach(function() {
        sinon.stub(container, 'remove');
        sinon.stub(hostView, '$').returns(container);
      });

      afterEach(function() {
        container.remove.restore();
        hostView.$.restore();
      });

      it("tooltip should be removed", function() {
        hostView.willDestroyElement();
        expect(container.remove.calledOnce).to.be.true;
      });
    });

    describe('#displayComponents', function () {

      var cases = [
        {
          hostComponents: [
            {
              displayName: 'c0'
            },
            {
              displayName: 'c1'
            }
          ],
          showHostsTableListPopupCallCount: 1,
          title: 'should display host components in modal popup'
        },
        {
          hostComponents: [],
          showHostsTableListPopupCallCount: 0,
          title: 'should not display modal popup'
        }
      ];

      beforeEach(function () {
        sinon.stub(App, 'showHostsTableListPopup', Em.K);
      });

      afterEach(function () {
        App.showHostsTableListPopup.restore();
      });

      cases.forEach(function (item) {
        it(item.title, function () {
          hostView.set('content', {
            hostName: 'h',
            hostComponents: item.hostComponents
          });
          hostView.displayComponents();
          expect(App.showHostsTableListPopup.callCount).to.equal(item.showHostsTableListPopupCallCount);
          if (item.showHostsTableListPopupCallCount) {
            expect(App.showHostsTableListPopup.calledWith(Em.I18n.t('common.components'), 'h', ['c0', 'c1'])).to.be.true;
          }
        });
      });

    });

    describe('#displayVersions', function () {

      var cases = [
        {
          stackVersions: [
            Em.Object.create({
              displayName: 'v0',
              status: 'CURRENT',
              isVisible: true
            }),
            Em.Object.create({
              displayName: 'v1',
              status: 'OUT_OF_SYNC',
              isVisible: true
            }),
            Em.Object.create({
              displayName: 'v2',
              status: 'INSTALL_FAILED',
              isVisible: false
            })
          ],
          showHostsTableListPopupCallCount: 1,
          title: 'should display stack versions in modal popup'
        },
        {
          stackVersions: [
            Em.Object.create({
              displayName: 'v0',
              status: 'CURRENT',
              isVisible: true
            }),
            Em.Object.create({
              displayName: 'v2',
              status: 'INSTALL_FAILED',
              isVisible: false
            })
          ],
          showHostsTableListPopupCallCount: 0,
          title: 'should not display modal popup if there\'s only one visible stack version'
        },
        {
          stackVersions: [
            Em.Object.create({
              displayName: 'v2',
              status: 'INSTALL_FAILED',
              isVisible: false
            })
          ],
          showHostsTableListPopupCallCount: 0,
          title: 'should not display modal popup if there are no visible stack versions available'
        },
        {
          stackVersions: [],
          showHostsTableListPopupCallCount: 0,
          title: 'should not display modal popup if there are no stack versions available'
        }
      ];

      beforeEach(function () {
        sinon.stub(App, 'showHostsTableListPopup', Em.K);
      });

      afterEach(function () {
        App.showHostsTableListPopup.restore();
      });

      cases.forEach(function (item) {
        it('should display stack versions in modal popup', function () {
          hostView.set('content', {
            hostName: 'h',
            stackVersions: item.stackVersions
          });
          hostView.displayVersions();
          expect(App.showHostsTableListPopup.callCount).to.equal(item.showHostsTableListPopupCallCount);
          if (item.showHostsTableListPopupCallCount) {
            expect(App.showHostsTableListPopup.calledWith(Em.I18n.t('common.versions'), 'h', [
              {
                name: 'v0',
                status: 'Current'
              },
              {
                name: 'v1',
                status: 'Out Of Sync'
              }
            ])).to.be.true;
          }
        });
      });

    });

    describe("#restartRequiredComponentsMessage", function () {

      it("5 components require restart", function() {
        var content = 'c1, c2, c3, c4, c5 ' + Em.I18n.t('common.components').toLowerCase();
        hostView.set('content.componentsWithStaleConfigsCount', 5);
        hostView.set('content.componentsWithStaleConfigs', [
          {displayName: 'c1'},
          {displayName: 'c2'},
          {displayName: 'c3'},
          {displayName: 'c4'},
          {displayName: 'c5'}
        ]);
        hostView.propertyDidChange('restartRequiredComponentsMessage');
        expect(hostView.get('restartRequiredComponentsMessage')).to.be.equal(
          Em.I18n.t('hosts.table.restartComponents.withNames').format(content)
        );
      });

      it("1 component require restart", function() {
        var content = 'c1 ' + Em.I18n.t('common.component').toLowerCase();
        hostView.set('content.componentsWithStaleConfigsCount', 1);
        hostView.set('content.componentsWithStaleConfigs', [
          {displayName: 'c1'}
        ]);
        hostView.propertyDidChange('restartRequiredComponentsMessage');
        expect(hostView.get('restartRequiredComponentsMessage')).to.be.equal(
          Em.I18n.t('hosts.table.restartComponents.withNames').format(content)
        );
      });

      it("6 components require restart", function() {
        hostView.set('content.componentsWithStaleConfigsCount', 6);
        hostView.set('content.componentsWithStaleConfigs', [
          {displayName: 'c1'},
          {displayName: 'c2'},
          {displayName: 'c3'},
          {displayName: 'c4'},
          {displayName: 'c5'},
          {displayName: 'c6'}
        ]);
        hostView.propertyDidChange('restartRequiredComponentsMessage');
        expect(hostView.get('restartRequiredComponentsMessage')).to.be.equal(
          Em.I18n.t('hosts.table.restartComponents.withoutNames').format(6)
        );
      });
    });

    describe("#componentsInPassiveStateMessage", function () {

      it("5 components in passive state", function() {
        hostView.set('content.componentsInPassiveStateCount', 5);
        hostView.set('content.componentsInPassiveState', [
          {displayName: 'c1'},
          {displayName: 'c2'},
          {displayName: 'c3'},
          {displayName: 'c4'},
          {displayName: 'c5'}
        ]);
        hostView.propertyDidChange('componentsInPassiveStateMessage');
        expect(hostView.get('componentsInPassiveStateMessage')).to.be.equal(
          Em.I18n.t('hosts.table.componentsInPassiveState.withNames').format('c1, c2, c3, c4, c5')
        );
      });

      it("1 components in passive state", function() {
        hostView.set('content.componentsInPassiveStateCount', 1);
        hostView.set('content.componentsInPassiveState', [
          {displayName: 'c1'}
        ]);
        hostView.propertyDidChange('componentsInPassiveStateMessage');
        expect(hostView.get('componentsInPassiveStateMessage')).to.be.equal(
          Em.I18n.t('hosts.table.componentsInPassiveState.withNames').format('c1')
        );
      });

      it("6 components in passive state", function() {
        hostView.set('content.componentsInPassiveStateCount', 6);
        hostView.set('content.componentsInPassiveState', [
          {displayName: 'c1'},
          {displayName: 'c2'},
          {displayName: 'c3'},
          {displayName: 'c4'},
          {displayName: 'c5'},
          {displayName: 'c6'}
        ]);
        hostView.propertyDidChange('componentsInPassiveStateMessage');
        expect(hostView.get('componentsInPassiveStateMessage')).to.be.equal(
          Em.I18n.t('hosts.table.componentsInPassiveState.withoutNames').format(6)
        );
      });
    });

    describe('#currentVersion', function () {

      var cases = [
        {
          stackVersions: [
            Em.Object.create({
              displayName: 'HDP-2.2.0.0-2000'
            }),
            Em.Object.create({
              displayName: 'HDP-2.2.0.0-1000',
              isCurrent: true
            })
          ],
          currentVersion: 'HDP-2.2.0.0-1000',
          title: 'current version specified explicitly'
        },
        {
          stackVersions: [
            Em.Object.create({
              displayName: 'HDP-2.2.0.0-2000'
            }),
            Em.Object.create({
              displayName: 'HDP-2.3.0.0-1000'
            })
          ],
          currentVersion: 'HDP-2.2.0.0-2000',
          title: 'current version not specified explicitly'
        },
        {
          stackVersions: [Em.Object.create()],
          currentVersion: undefined,
          title: 'version display name isn\'t defined'
        },
        {
          stackVersions: [null],
          currentVersion: '',
          title: 'no version data available'
        },
        {
          stackVersions: [],
          currentVersion: '',
          title: 'no versions available'
        }
      ];

      cases.forEach(function (item) {
        it(item.title, function () {
          hostView.set('content.stackVersions', item.stackVersions);
          expect(hostView.get('currentVersion')).to.equal(item.currentVersion);
        });
      });
    });

    describe("#usageStyle", function () {

      it("usageStyle should be 'width:100%'", function() {
        hostView.set('content.diskUsage', 100);
        hostView.propertyDidChange('usageStyle');
        expect(hostView.get('usageStyle')).to.be.equal('width:100%');
      });
    });
  });

  describe("#updateHostsCount()", function () {

    it("should update host counter in categories", function() {
      view.reopen({
        categories: [
          Em.Object.create({healthStatus: ''}),
          Em.Object.create({healthStatus: 'HEALTHY'}),
          Em.Object.create({healthStatus: 'UNKNOWN', hostsCount: 0, hasHosts: false})
        ]
      });
      view.set('controller.hostsCountMap', {
        TOTAL: 10,
        HEALTHY: 1
      });
      view.updateHostsCount();
      expect(view.get('categories').mapProperty('hostsCount')).to.be.eql([10, 1, 0]);
      expect(view.get('categories').mapProperty('hasHosts')).to.be.eql([true, true, false]);
    });
  });

  describe("#categoryObject", function () {
    var categoryObject;

    beforeEach(function() {
      categoryObject = view.get('categoryObject').create();
    });

    describe("#label", function () {

      it("should return label", function() {
        categoryObject.set('hostsCount', 1);
        categoryObject.set('value', 'val1');
        expect(categoryObject.get('label')).to.be.equal('val1 (1)');
      });
    });
  });

  describe("#statusFilter", function () {
    var statusFilter;

    beforeEach(function () {
      statusFilter = view.get('statusFilter').create({
        parentView: Em.Object.create({
          resetFilterByColumns: Em.K,
          refresh: Em.K,
          updateFilter: Em.K
        })
      });
    });

    describe("#comboBoxLabel", function () {
      beforeEach(function() {
        sinon.stub(statusFilter, 'onCategoryChange');
      });

      afterEach(function() {
        statusFilter.onCategoryChange.restore();
      });

      var testCases = [
        {
          value: 'val1',
          categories: [Em.Object.create({isActive: true, hostsCount: 1, value: "val1"})],
          totalCount: 10,
          expected: 'val1 (1)'
        },
        {
          value: 'val1',
          categories: [Em.Object.create({isActive: false, hostsCount: 1})],
          totalCount: 10,
          expected: Em.I18n.t('common.all') + ' (10)'
        },
        {
          value: '',
          categories: [],
          totalCount: 10,
          expected: Em.I18n.t('common.all') + ' (10)'
        }
      ];

      testCases.forEach(function(test) {
        it("value=" + test.value +
           " categories=" + JSON.stringify(test.categories) +
           " totalCount=" + test.totalCount, function () {
          statusFilter.setProperties({
            value: test.value,
            categories: test.categories
          });
          statusFilter.set('parentView.totalCount', test.totalCount);
          expect(statusFilter.get('comboBoxLabel')).to.be.equal(test.expected);
        });
      });
    });

    describe("#onCategoryChange()", function () {

      it("should set class", function() {
        statusFilter.setProperties({
          value: 'val1',
          categories: [
            Em.Object.create({
              healthStatus: 'val1',
              class: 'cl1',
              healthClass: 'hcl1'
            })
          ]
        });
        expect(statusFilter.get('class')).to.be.equal('cl1 hcl1');
        expect(statusFilter.get('categories')[0].get('isActive')).to.be.true;
      });
    });

    describe("#showClearFilter()", function () {

      beforeEach(function() {
        sinon.stub(statusFilter, 'selectCategory');
        sinon.stub(statusFilter, 'onCategoryChange');
      });

      afterEach(function() {
        statusFilter.selectCategory.restore();
        statusFilter.onCategoryChange.restore();
      });

      it("selectCategory should be called", function() {
        statusFilter.setProperties({
          value: 'val1',
          categories: [
            Em.Object.create({
              healthStatus: 'val1'
            })
          ]
        });
        statusFilter.showClearFilter();
        expect(statusFilter.selectCategory.getCall(0).args).to.be.eql([
          {
            context: Em.Object.create({
              healthStatus: 'val1'
            })
          }
        ]);
      });
    });

    describe("#selectCategory()", function () {
      var category = Em.Object.create({
        healthStatus: 'val1',
        column: 1,
        isHealthStatus: false,
        filterValue: 'val1',
        type: 't1'
      });

      beforeEach(function() {
        sinon.stub(statusFilter.get('parentView'), 'resetFilterByColumns');
        sinon.stub(statusFilter.get('parentView'), 'refresh');
        sinon.stub(statusFilter.get('parentView'), 'updateFilter');
        sinon.stub(statusFilter, 'onCategoryChange');
      });

      afterEach(function() {
        statusFilter.get('parentView').resetFilterByColumns.restore();
        statusFilter.get('parentView').refresh.restore();
        statusFilter.get('parentView').updateFilter.restore();
        statusFilter.onCategoryChange.restore();
      });

      it("value should be set", function() {
        statusFilter.selectCategory({context: category});
        expect(statusFilter.get('value')).to.be.equal('val1');
      });

      it("resetFilterByColumns should be called", function() {
        statusFilter.selectCategory({context: category});
        expect(statusFilter.get('parentView').resetFilterByColumns.calledWith([0, 7, 8, 9])).to.be.true;
      });

      it("updateFilter should be called, isHealthStatus=false", function() {
        category.set('isHealthStatus', false);
        statusFilter.selectCategory({context: category});
        expect(statusFilter.get('parentView').updateFilter.calledWith(1, 'val1', 't1')).to.be.true;
      });

      it("updateFilter should be called, isHealthStatus=true", function() {
        category.set('isHealthStatus', true);
        category.set('healthStatus', 'val1');
        statusFilter.selectCategory({context: category});
        expect(statusFilter.get('parentView').updateFilter.calledWith(0, 'val1', 'string')).to.be.true;
      });

      it("refresh should be called, isHealthStatus=true", function() {
        category.set('isHealthStatus', true);
        category.set('healthStatus', null);
        statusFilter.selectCategory({context: category});
        expect(statusFilter.get('parentView').refresh.calledOnce).to.be.true;
      });
    });

    describe("#clearFilter()", function () {

      beforeEach(function() {
        sinon.stub(statusFilter, 'showClearFilter');
        sinon.stub(statusFilter, 'onCategoryChange');
      });

      afterEach(function() {
        statusFilter.showClearFilter.restore();
        statusFilter.onCategoryChange.restore();
      });

      it("isActive should be false", function() {
        statusFilter.set('categories', [Em.Object.create()]);
        statusFilter.clearFilter();
        expect(statusFilter.get('categories')[0].get('isActive')).to.be.false;
      });

      it("value should be empty", function() {
        statusFilter.clearFilter();
        expect(statusFilter.get('value')[0]).to.be.empty;
      });

      it("class should be empty", function() {
        statusFilter.clearFilter();
        expect(statusFilter.get('class')).to.be.empty;
      });

      it("showClearFilter should be called", function() {
        statusFilter.clearFilter();
        expect(statusFilter.showClearFilter.calledOnce).to.be.true;
      });
    });
  });

  describe("#clearFilters()", function () {

    beforeEach(function() {
      sinon.stub(view, 'clearFilterConditionsFromLocalStorage');
      sinon.stub(view, 'refresh');
    });

    afterEach(function() {
      view.clearFilterConditionsFromLocalStorage.restore();
      view.refresh.restore();
    });

    it("filterConditions should be empty", function() {
      view.clearFilters();
      expect(view.get('filterConditions')).to.be.empty;
    });

    it("clearFilterConditionsFromLocalStorage should be called", function() {
      view.clearFilters();
      expect(view.clearFilterConditionsFromLocalStorage.calledOnce).to.be.true;
    });

    it("refresh should be called", function() {
      view.clearFilters();
      expect(view.refresh.calledOnce).to.be.true;
    });
  });
});
