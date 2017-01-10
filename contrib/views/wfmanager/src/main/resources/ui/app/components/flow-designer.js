/*
*    Licensed to the Apache Software Foundation (ASF) under one or more
*    contributor license agreements.  See the NOTICE file distributed with
*    this work for additional information regarding copyright ownership.
*    The ASF licenses this file to You under the Apache License, Version 2.0
*    (the "License"); you may not use this file except in compliance with
*    the License.  You may obtain a copy of the License at
*
*        http://www.apache.org/licenses/LICENSE-2.0
*
*    Unless required by applicable law or agreed to in writing, software
*    distributed under the License is distributed on an "AS IS" BASIS,
*    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*    See the License for the specific language governing permissions and
*    limitations under the License.
*/

import Ember from 'ember';
import {Workflow} from '../domain/workflow';
import Constants from '../utils/constants';
import {WorkflowGenerator} from '../domain/workflow-xml-generator';
import {WorkflowImporter} from '../domain/workflow-importer';
import {WorkflowJsonImporter} from '../domain/workflow-json-importer';
import {WorkflowContext} from '../domain/workflow-context';
import {JSPlumbRenderer} from '../domain/jsplumb-flow-renderer';
import {CytoscapeRenderer} from '../domain/cytoscape-flow-renderer';
import {FindNodeMixin} from '../domain/findnode-mixin';
import { validator, buildValidations } from 'ember-cp-validations';
import WorkflowPathUtil from '../domain/workflow-path-util';
import {ActionTypeResolver} from '../domain/action-type-resolver';
import CommonUtils from "../utils/common-utils";

const Validations = buildValidations({
  'dataNodes': { /* For Cytoscape */
    validators: [
      validator('duplicate-data-node-name', {
        dependentKeys: ['dataNodes.@each.dataNodeName']
      })
    ]
  },
  'workflow.killNodes': {
    validators: [
      validator('duplicate-kill-node-name', {
        dependentKeys: ['workflow.killNodes.@each.name']
      })
    ]
  },
  'flattenedNodes': {
    validators: [
      validator('duplicate-flattened-node-name', {
        dependentKeys: ['flattenedNodes.@each.name']
      })
    ]
  }
});

export default Ember.Component.extend(FindNodeMixin, Validations, {
  workflowContext : WorkflowContext.create({}),
  workflowTitle:"",
  previewXml:"",
  supportedActionTypes:["java", "hive", "pig", "sqoop", "shell", "spark", "map-reduce", "hive2", "sub-workflow", "distcp", "ssh", "FS"],
  workflow:null,
  hoveredWidget:null,/**/
  showingConfirmationNewWorkflow:false,
  showingWorkflowConfigProps:false,
  workflowSubmitConfigs:{},
  showingPreview:false,
  currentTransition:null,
  currentNode:null,
  domain:{},
  showActionEditor : false,
  flattenedNodes: [],
  dataNodes: [], /* For cytoscape */
  hoveredAction: null,
  workflowImporter:WorkflowImporter.create({}),
  actionTypeResolver: ActionTypeResolver.create({}),
  propertyExtractor : Ember.inject.service('property-extractor'),
  clipboardService : Ember.inject.service('workflow-clipboard'),
  workspaceManager : Ember.inject.service('workspace-manager'),
  assetManager : Ember.inject.service('asset-manager'),
  showGlobalConfig : false,
  showParameterSettings : false,
  showNotificationPanel : false,
  globalConfig : {},
  assetConfig : {},
  parameters : {},
  clonedDomain : {},
  clonedErrorNode : {},
  validationErrors : [],
  showingFileBrowser : false,
  killNode : {},
  isWorkflowImporting: false,
  isAssetPublishing: false,
  errorMsg: "",
  shouldPersist : false,
  useCytoscape: Constants.useCytoscape,
  cyOverflow: {},
  clipboard : Ember.computed.alias('clipboardService.clipboard'),
  isStackTraceVisible: false,
  isStackTraceAvailable: false,
  stackTrace:"",
  showingStreamImport:false,
  fileInfo:Ember.Object.create(),
  isDraft: false,
  saveJobService : Ember.inject.service('save-job'),
  initialize : function(){
    var id = 'cy-' + Math.ceil(Math.random() * 1000);
    this.set('cyId', id);
    this.sendAction('register', this.get('tabInfo'), this);
    CommonUtils.setTestContext(this);
  }.on('init'),
  elementsInserted :function(){
    if (this.useCytoscape){
      this.flowRenderer=CytoscapeRenderer.create({id : this.get('cyId')});
    }else{
      this.flowRenderer=JSPlumbRenderer.create({});
    }
    this.setConentWidth();
    this.set('workflow',Workflow.create({}));
    if(this.get("xmlAppPath")){
      this.showExistingWorkflow();
      return;
    } else {
      this.workflow.initialize();
      this.initAndRenderWorkflow();
      this.$('#wf_title').focus();
      if (Constants.autoRestoreWorkflowEnabled){
        this.restoreWorkflow();
      }
    }
    if(Ember.isBlank(this.get('workflow.name'))){
      this.set('workflow.name', Ember.copy(this.get('tabInfo.name')));
    }
  }.on('didInsertElement'),
  restoreWorkflow(){
    if (!this.get("isNew")){
      this.getDraftWorkflow().promise.then(function(draftWorkflow){
        if (draftWorkflow){
          this.resetDesigner();
          this.set("workflow",draftWorkflow);
          this.rerender();
          this.doValidation();
        }
      }.bind(this)).catch(function(data){
      });
    }
  },
  observeXmlAppPath : Ember.observer('xmlAppPath', function(){
    if(!this.get('xmlAppPath') || null === this.get('xmlAppPath')){
      return;
    }else{
      this.showExistingWorkflow();
    }
  }),
  observeFilePath : Ember.observer('workflowFilePath', function(){
    if(!this.get('workflowFilePath') || null === this.get('workflowFilePath')){
      return;
    }else{
      this.sendAction('changeFilePath', this.get('tabInfo'), this.get('workflowFilePath'));
    }
  }),
  nameObserver : Ember.observer('workflow.name', function(){
    if(!this.get('workflow')){
      return;
    }else if(this.get('workflow') && Ember.isBlank(this.get('workflow.name'))){
      if(!this.get('clonedTabInfo')){
        this.set('clonedTabInfo', Ember.copy(this.get('tabInfo')));
      }
      this.sendAction('changeTabName', this.get('tabInfo'), this.get('clonedTabInfo.name'));
    }else{
      this.sendAction('changeTabName', this.get('tabInfo'), this.get('workflow.name'));
    }
  }),
  showParentWorkflow(type, path){
    this.sendAction('openTab', type, path);
  },
  showExistingWorkflow(){
    var workflowXmlPath = this.get("xmlAppPath"), relXmlPath = "", tempArr;
    if(workflowXmlPath.indexOf("://") === -1 && workflowXmlPath.indexOf(":") === -1){
      relXmlPath = workflowXmlPath;
    } else{
      tempArr = workflowXmlPath.split("//")[1].split("/");
      tempArr.splice(0, 1);
      relXmlPath = "/" + tempArr.join("/");
      if(relXmlPath.indexOf(".xml") !== relXmlPath.length-4) {
        if(relXmlPath.charAt(relXmlPath.length-1) !== "/"){
          relXmlPath = relXmlPath+ "/" +"workflow.xml";
        } else{
          relXmlPath = relXmlPath+"workflow.xml";
        }
      }
    }
    this.importWorkflow(relXmlPath);
  },
  setConentWidth(){
    var offset = 120;
    if (Ember.ENV.instanceInfo) {
      offset = 0;
    }
    Ember.$(window).resize(function() {
      return;
    });
  },
  workflowXmlDownload(workflowXml){
      var link = document.createElement("a");
      link.download = "workflow.xml";
      link.href = "data:text/xml,"+encodeURIComponent(vkbeautify.xml(workflowXml));
      link.click();
  },
  nodeRendered: function(){
    this.doValidation();
    if(this.get('renderNodeTransitions')){
      this.flowRenderer.onDidUpdate(this,this.get("workflow").startNode,this.get("workflow"));
      this.layout();
      this.set('renderNodeTransitions',false);
    }
    this.resize();
    this.persistWorkInProgress();
  }.on('didUpdate'),
  resize(){
    this.flowRenderer.resize();
  },
  cleanupFlowRenderer:function(){
    this.set('renderNodeTransitions',false);
    this.flowRenderer.cleanup();
  }.on('willDestroyElement'),
  initAndRenderWorkflow(){
    var panelOffset=this.$(".designer-panel").offset();
    var canvasHeight=Ember.$(window).height()-panelOffset.top-25;
    this.flowRenderer.initRenderer(function(){
      this.renderWorkflow();
    }.bind(this),{context:this,flattenedNodes:this.get("flattenedNodes"),dataNodes:this.get("dataNodes"), cyOverflow:this.get("cyOverflow"),canvasHeight:canvasHeight});
  },
  renderWorkflow(){
    this.set('renderNodeTransitions', true);
    this.flowRenderer.renderWorkflow(this.get("workflow"));
    this.doValidation();
  },
  rerender(){
    this.flowRenderer.cleanup();
    this.renderWorkflow(this.get("workflow"));
  },
  setCurrentTransition(transition){
    this.set("currentTransition",transition);
  },
  actionInfo(node){
    this.send("showNotification", node);
  },
  deleteTransition(transition){
    this.createSnapshot();
    this.get("workflow").deleteTransition(transition);
    this.showUndo('transition');
    this.rerender();
  },
  showWorkflowActionSelect(element){
    var self=this;
    this.$('.popover').popover('destroy');
    Ember.$(element).parents(".jsplumb-overlay").css("z-index", "4");
    this.$(element).attr('data-toggle','popover');
    this.$(element).popover({
      html : true,
      title : "Add Node <button type='button' class='close'>&times;</button>",
      placement: 'right',
      trigger : 'focus',
      content : function(){
        return self.$('#workflow-actions').html();
      }
    });
    this.$(element).popover("show");
    this.$('.popover .close').on('click',function(){
      Ember.$(".jsplumb-overlay").css("z-index", "");
      this.$('.popover').popover('destroy');
    }.bind(this));
  },

  layout(){
    this.flowRenderer.refresh();
  },
  doValidation(){
    this.validate();
  },
  getStackTrace(data){
    if(data){
     try{
      var stackTraceMsg = JSON.parse(data).stackTrace;
      if(!stackTraceMsg){
        return "";
      }
     if(stackTraceMsg instanceof Array){
       return stackTraceMsg.join("").replace(/\tat /g, '&nbsp;&nbsp;&nbsp;&nbsp;at&nbsp;');
     } else {
       return stackTraceMsg.replace(/\tat /g, '<br/>&nbsp;&nbsp;&nbsp;&nbsp;at&nbsp;');
     }
     } catch(err){
       return "";
     }
    }
    return "";
  },
  importWorkflow(filePath){
    var self = this;
    this.set("isWorkflowImporting", true);
    this.resetDesigner();
    //this.set("isWorkflowImporting", true);
    var workflowXmlDefered=this.getWorkflowFromHdfs(filePath);
    workflowXmlDefered.promise.then(function(data){
      this.importWorkflowFromString(data);
      this.set("isWorkflowImporting", false);
      this.set("workflowFilePath", filePath);
    }.bind(this)).catch(function(data){
      console.error(data);
      var stackTraceMsg = self.getStackTrace(data.responseText);
      self.set("errorMsg", "There is some problem while importing.Please try again.");
      self.showingErrorMsgInDesigner(data);
      self.set("isWorkflowImporting", false);
    });
  },
  importWorkflowFromString(data){
    var wfObject=this.get("workflowImporter").importWorkflow(data);
    if(this.get('workflow')){
      this.resetDesigner();
      this.set("workflow",wfObject.workflow);
      this.initAndRenderWorkflow();
      this.rerender();
      this.doValidation();
      this.set("errors", wfObject.errors);
    }else{
      this.workflow.initialize();
      this.set("workflow",wfObject.workflow);
      this.initAndRenderWorkflow();
      this.$('#wf_title').focus();
    }
  },
  getWorkflowFromHdfs(filePath){
    var url = Ember.ENV.API_URL + "/readWorkflowXml?workflowXmlPath="+filePath;
    var deferred = Ember.RSVP.defer();
    Ember.$.ajax({
      url: url,
      method: 'GET',
      dataType: "text",
      beforeSend: function (xhr) {
        xhr.setRequestHeader("X-XSRF-HEADER", Math.round(Math.random()*100000));
        xhr.setRequestHeader("X-Requested-By", "Ambari");
      }
    }).done(function(data){
      deferred.resolve(data);
    }).fail(function(data){
      deferred.reject(data);
    });
    return deferred;
  },
  importActionSettingsFromString(actionSettings) {
    var x2js = new X2JS();
    var actionSettingsObj = x2js.xml_str2json(actionSettings);
    var currentActionNode = this.flowRenderer.currentCyNode.data().node;
    if (actionSettingsObj[currentActionNode.actionType]) {
      var actionJobHandler = this.actionTypeResolver.getActionJobHandler(currentActionNode.actionType);
      actionJobHandler.handleImport(currentActionNode, actionSettingsObj[currentActionNode.actionType]);
      this.flowRenderer.hideOverlayNodeActions();
    } else {
      this.set("errorMsg", "Invalid asset settings");
    }
  },
  importActionNodeFromString(actionNodeXmlString) {
    var x2js = new X2JS();
    var actionNodeXml = x2js.xml_str2json(actionNodeXmlString);
    var actionNodeType = Object.keys(actionNodeXml)[0];
    var currentTransition = this.get("currentTransition");
    this.createSnapshot();
    var actionNode = this.get("workflow").addNode(this.findTransition(this.get("workflow").startNode, currentTransition.sourceNodeId, currentTransition.targetNode.id),actionNodeType);
    this.rerender();
    this.doValidation();
    this.scrollToNewPosition();
    var actionJobHandler = this.actionTypeResolver.getActionJobHandler(actionNodeType);
    actionJobHandler.handleImport(actionNode, actionNodeXml[actionNodeType]);
  },
  getRandomDataToDynamicProps(dynamicProperties) {
    var wfDynamicProps = [];
    var wfParams = this.get('workflow.parameters');
    dynamicProperties.forEach(function(property) {
      if (property!=="${nameNode}" && property!==Constants.rmDefaultValue) {
        var propName = property.trim().substring(2, property.length-1);
        var propValue;
        if (wfParams && wfParams.configuration && wfParams.configuration.property) {
          var param = wfParams.configuration.property.findBy('name', propName);
          if (!(param && param.value)) {
            propValue = param.value;
          }
        }
        var prop = Ember.Object.create({
          name: propName,
          value: propValue ? propValue : Math.random().toString(36).slice(2)
        });
        wfDynamicProps.push(prop);
      }
    });
    return wfDynamicProps;
  },
  exportActionNodeXml() {
    var self = this;
    self.set("isAssetPublishing", true);
    var workflowGenerator = WorkflowGenerator.create({workflow:this.get("workflow"), workflowContext:this.get('workflowContext')});
    var actionNodeXml = workflowGenerator.getActionNodeXml(this.flowRenderer.currentCyNode.data().name, this.flowRenderer.currentCyNode.data().node.actionType);
    var dynamicProperties = this.get('propertyExtractor').getDynamicProperties(actionNodeXml);

    var exportActionNodeXmlDefered=this.get("assetManager").publishAsset(this.get('exportActionNodeFilePath'), actionNodeXml, this.getRandomDataToDynamicProps(dynamicProperties));
    exportActionNodeXmlDefered.promise.then(function(data){
      self.set("isAssetPublishing", false);
    }.bind(this)).catch(function(data){
      self.set("errorMsg", "There is some problem while publishing asset. Please try again.");
      self.showingErrorMsgInDesigner(data);
      self.set("isAssetPublishing", false);
    });

    console.log("Action Node", actionNodeXml);
  },
  resetDesigner(){
    this.set("xmlAppPath", null);
    this.set('errors',[]);
    this.set('errorMsg',"");
    this.set('validationErrors',[]);
    this.set('workflowFilePath',"");
    this.get("workflow").resetWorfklow();
    this.set('globalConfig', {});
    this.set('parameters', {});
    if(this.get('workflow.parameters') !== null){
      this.set('workflow.parameters', {});
    }
    this.set('parameters', {});
    this.flowRenderer.reset();
  },
  resetZoomLevel(){
    this.set("zoomLevel", 1);
  },
  incZoomLevel(){
    this.set("zoomLevel", this.get("zoomLevel")+0.1);
  },
  decZoomLevel(){
    this.set("zoomLevel", this.get("zoomLevel")-0.1);
  },
  importSampleWorkflow (){
    var deferred = Ember.RSVP.defer();
    Ember.$.ajax({
      url: "/sampledata/workflow.xml",
      dataType: "text",
      cache:false,
      success: function(data) {
        var wfObject=this.get("workflowImporter").importWorkflow(data);
        deferred.resolve(wfObject.workflow);
      }.bind(this),
      failure : function(data){
        deferred.reject(data);
      }
    });
    return deferred;
  },
  saveAsDraft(){
    var self = this, url = Ember.ENV.API_URL + "/saveWorkflowDraft?app.path=" + this.get("workflowFilePath") + "&overwrite=" + this.get("overwritePath");
    Ember.$.ajax({
      url: url,
      method: "POST",
      dataType: "text",
      contentType: "text/plain;charset=utf-8",
      beforeSend: function(request) {
        request.setRequestHeader("X-XSRF-HEADER", Math.round(Math.random()*100000));
        request.setRequestHeader("X-Requested-By", "workflow-designer");
      },
      data: self.getWorkflowAsJson(),
      success: function(response) {
        //deferred.resolve(response);
      }.bind(this),
      error: function(response) {
        //deferred.reject(response);
      }.bind(this)
    });
  },
  persistWorkInProgress(){
   var json=this.getWorkflowAsJson();
   this.get('workspaceManager').saveWorkInProgress(this.get('tabInfo.id'), json);
  },
  getWorkflowAsJson(){
    try{
     var json=JSON.stringify(this.get("workflow")), self = this;
     var actionVersions = JSON.stringify([...this.get("workflow").schemaVersions.actionVersions]);
     var workflow = JSON.parse(json);
     workflow.schemaVersions.actionVersions = actionVersions
     //this.get('workspaceManager').saveWorkInProgress(this.get('tabInfo.id'), json);
     return JSON.stringify(workflow);
   }catch(err){
    console.error(err);
     this.isCyclic(this.get("workflow"));
   }
  },
  isCyclic (obj) {
    var seenObjects = [];
    function detect (obj) {
      if (typeof obj === 'object') {
        if (seenObjects.indexOf(obj) !== -1) {
          console.log("object already seen",obj);
          return true;
        }
        seenObjects.push(obj);
        for (var key in obj) {
          if (obj.hasOwnProperty(key) && detect(obj[key])) {
            console.log("object already seen",key);
            return true;
          }
        }
      }
      return false;
    }
    return detect(obj);
  },
  getDraftWorkflowData(path){
    var deferred = Ember.RSVP.defer();
    //var path = encodeURIComponent("/user/ambari-qa/examples/demo/draft");
    var self = this, url = Ember.ENV.API_URL + "/readWorkflowDraft?workflowXmlPath=" + path;
    Ember.$.ajax({
      url: url,
      dataType: "text",
      contentType: "text/plain;charset=utf-8",
      beforeSend: function(request) {
        request.setRequestHeader("X-XSRF-HEADER", Math.round(Math.random()*100000));
        request.setRequestHeader("X-Requested-By", "workflow-designer");
      },
      success: function(response) {
        deferred.resolve(response);
      }.bind(this),
      error: function(response) {
        deferred.reject(response);
      }.bind(this)
    });
    return deferred;
  },
  getDraftWorkflow(){
    var deferred = Ember.RSVP.defer();
    var drafWorkflowJson = this.get('workspaceManager').restoreWorkInProgress(this.get('tabInfo.id'));
    var workflowImporter=WorkflowJsonImporter.create({});
    var workflow=workflowImporter.importWorkflow(drafWorkflowJson);
    deferred.resolve(workflow);
    return deferred;
  },
  createSnapshot() {
    this.set('undoAvailable', false);
    this.set('workflowSnapshot', this.getWorkflowAsJson());
  },
  showUndo (type){
    this.set('undoAvailable', true);
    this.set('undoType', type);
  },
  deleteWorkflowNode(node){
    this.createSnapshot();
    if(node.isKillNode()){
      var result=this.get("workflow").deleteKillNode(node);
      if (result && result.status===false){
        this.get('validationErrors').pushObject({node : node ,message :result.message});
      }
    } else {
      this.get("workflow").deleteNode(node);
    }
    this.rerender();
    this.doValidation();
    this.showUndo('node');
  },
  addWorkflowBranch(node){
    this.createSnapshot();
    this.get("workflow").addBranch(node);
    this.rerender();
  },
  openWorkflowEditor(node){
    this.createSnapshot();
    var validOkToNodes = WorkflowPathUtil.findValidTransitionsTo(this.get('workflow'), node);
    this.set('showActionEditor', true);
    this.set('currentAction', node.actionType);
    var domain = node.getNodeDetail();
    this.set('clonedDomain',Ember.copy(domain));
    this.set('clonedErrorNode', node.errorNode);
    this.set('clonedKillMessage',node.get('killMessage'));
    node.set("domain", domain);
    node.set("validOkToNodes", validOkToNodes);
    this.set('currentNode', node);
  },
  openDecisionEditor(node) {
    this.get("addBranchListener").trigger("showBranchOptions", node);
  },

  copyNode(node){
    this.get('clipboardService').setContent(node, 'copy');
  },
  cutNode(node){
    this.get('clipboardService').setContent(node, 'cut');
    this.deleteWorkflowNode(node);
  },
  replaceNode(node){
    var clipboardContent = this.get('clipboardService').getContent();
    Ember.set(node, 'name', clipboardContent.name+'-copy');
    Ember.set(node, 'domain', clipboardContent.domain);
    Ember.set(node, 'actionType', clipboardContent.actionType);
    this.rerender();
    this.doValidation();
  },
  scrollToNewPosition(){
    if (Constants.useCytoscape){
      return;
    }
    var scroll = Ember.$(window).scrollTop();
    Ember.$('html, body')
    .animate({
      scrollTop: scroll+200
    }, 1000);
  },
  openSaveWorkflow() {
    this.get('workflowContext').clearErrors();
    var workflowGenerator=WorkflowGenerator.create({workflow:this.get("workflow"),
    workflowContext:this.get('workflowContext')});
    var workflowXml=workflowGenerator.process();
    if(this.get('workflowContext').hasErrors()){
      this.set('errors',this.get('workflowContext').getErrors());
      this.set("jobXmlJSONStr", this.getWorkflowAsJson());
      this.set("isDraft", true);
    }else{
      this.set("jobXmlJSONStr", this.getWorkflowAsJson());
      var dynamicProperties = this.get('propertyExtractor').getDynamicProperties(workflowXml);
      var configForSubmit={props:dynamicProperties,xml:workflowXml,params:this.get('workflow.parameters')};
      this.set("workflowSubmitConfigs",configForSubmit);
      this.set("isDraft", false);
    }
    this.set("showingSaveWorkflow",true);
  },
  openJobConfig (){
    this.get('workflowContext').clearErrors();
    var workflowGenerator=WorkflowGenerator.create({workflow:this.get("workflow"),
    workflowContext:this.get('workflowContext')});
    var workflowXml=workflowGenerator.process();
    if(this.get('workflowContext').hasErrors()){
      this.set('errors',this.get('workflowContext').getErrors());
    }else{
      var dynamicProperties = this.get('propertyExtractor').getDynamicProperties(workflowXml);
      var configForSubmit={props:Array.from(dynamicProperties.values(), key => key),xml:workflowXml,params:this.get('workflow.parameters')};
      this.set("workflowSubmitConfigs",configForSubmit);
      this.set("showingWorkflowConfigProps",true);
    }
  },
  showingErrorMsgInDesigner(data){
      var self = this, stackTraceMsg = self.getStackTrace(data.responseText);
      if(stackTraceMsg.length){
        self.set("isStackTraceVisible", true);
        self.set("stackTrace", stackTraceMsg);
        self.set("isStackTraceAvailable", true);
      } else {
        self.set("isStackTraceVisible", false);
        self.set("isStackTraceAvailable", false);
      }
  },
  isDraftExists(path){
    var deferred = Ember.RSVP.defer(), url, self = this;
    if(!path){
      path = this.get("workflowFilePath");
    }
    url = Ember.ENV.API_URL + "/readWorkflowDetail?workflowXmlPath=" + path;
    Ember.$.ajax({
      url: url,
      dataType: "text",
      contentType: "text/plain;charset=utf-8",
      beforeSend: function(request) {
        request.setRequestHeader("X-XSRF-HEADER", Math.round(Math.random()*100000));
        request.setRequestHeader("X-Requested-By", "workflow-designer");
      },
      success: function(response) {
        deferred.resolve(response);
      }.bind(this),
      error: function(response) {
        deferred.reject(response);
      }.bind(this)
    });
    return deferred;

  },
  importWorkflowFromFile(dataStr){
    this.resetDesigner();
    this.importWorkflowFromString(dataStr);
    this.send("hideStreamImport");
  },
  actions:{
    importWorkflowStream(dataStr){
      this.importWorkflowFromFile(dataStr);
    },
    saveFileinfo(path, overWritePath){
      this.get("fileInfo").set("path", path);
      this.get("fileInfo").set("overWritePath", overWritePath);
    },
    showStreamImport() {
      this.set("showingStreamImport", true);
    },
    hideStreamImport() {
      this.set("showingStreamImport", false);
    },
    fileLoaded(file){
      var self = this;
      function importWorkflowFromFile(dataStr){
          self.importWorkflowFromFile(dataStr);
      }
      var reader = new FileReader();
      reader.addEventListener("load", function (event) {
          importWorkflowFromFile(event.target.result);
      });
      reader.readAsText(file);
    },
    importActionSettings(file){
      var self = this;
      var reader = new FileReader();
      reader.addEventListener("load", function (event) {
        var actionSettings = event.target.result;
        var x2js = new X2JS();
        var actionNode = self.flowRenderer.currentCyNode.data().node;
        var actionJobHandler = self.actionTypeResolver.getActionJobHandler(actionNode.actionType);
        actionJobHandler.handleImport(actionNode, x2js.xml_str2json(actionSettings)[actionNode.actionType]);
        self.flowRenderer.hideOverlayNodeActions();
      });
      reader.readAsText(file);
    },
    importActionNodeLocalFS(file){
      var self = this;
      var reader = new FileReader();
      reader.addEventListener("load", function (event) {
        self.importActionNodeFromString(event.target.result);
      });
      reader.readAsText(file);
    },
    showStackTrace(){
      this.set("isStackTraceVisible", true);
    },
    hideStackTrace(){
      this.set("isStackTraceVisible", false);
    },
    showWorkflowSla (value) {
      this.set('showWorkflowSla', value);
    },
    showCreateKillNode (value){
      this.set('showKillNodeManager', value);
      this.set('addKillNodeMode', true);
      this.set('editMode', false);
    },
    showKillNodeManager (value){
      this.set('showKillNodeManager', value);
      this.set('addKillNodeMode', false);
    },
    closeKillNodeManager(){
      this.set("showKillNodeManager", false);
    },
    showVersionSettings(value){
      this.set('showVersionSettings', value);
    },
    showingParameterSettings(value){
      if(this.get('workflow.parameters') !== null){
        this.set('parameters', Ember.copy(this.get('workflow.parameters')));
      }else{
        this.set('parameters', {});
      }
      this.set('showParameterSettings', value);
    },
    showCredentials(value){
      this.set('showCredentials', value);
    },
    createKillNode(killNode){
      this.set("killNode", killNode);
      this.set("createKillnodeError",null);
      var existingKillNode=this.get('workflow').get("killNodes").findBy("name",this.get('killNode.name'));
      if (existingKillNode){
        this.set("createKillnodeError","The kill node already exists");
        return;
      }
      if (Ember.isBlank(this.get('killNode.name'))){
        this.set("createKillnodeError","The kill node cannot be empty");
        return;
      }
      this.get("workflow").createKillNode(this.get('killNode.name'),this.get('killNode.killMessage'));
      this.set('killNode',{});
      this.rerender();
      this.layout();
      this.doValidation();
      this.$("#kill-node-dialog").modal("hide");
      this.set('showCreateKillNode', false);
    },
    addNode(type){
      this.createSnapshot();
      var currentTransition=this.get("currentTransition");
      this.get("workflow").addNode(this.findTransition(this.get("workflow").startNode, currentTransition.sourceNodeId, currentTransition.targetNode.id),type);
      this.rerender();
      this.doValidation();
      this.scrollToNewPosition();
    },

    nameChanged(){
      this.doValidation();
    },
    copyNode(node){
      this.copyNode(node);
    },
    pasteNode(){
      var clipboardContent = this.get('clipboardService').getContent();
      var currentTransition = this.get("currentTransition");
      var node = this.get("workflow").addNode(currentTransition, clipboardContent.actionType);
      if(clipboardContent.operation === 'cut'){
        node.name = clipboardContent.name;
      }else{
        node.name = clipboardContent.name + '-copy';
      }
      node.domain = clipboardContent.domain;
      node.actionType = clipboardContent.actionType;
      this.rerender();
      this.doValidation();
      this.scrollToNewPosition();
    },
    deleteNode(node){
      this.deleteWorkflowNode(node);
    },
    openEditor(node){
      this.openWorkflowEditor(node);
    },
    setFilePath(filePath){
      this.set("workflowFilePath", filePath);
    },
    showNotification(node){
      this.set("showNotificationPanel", true);
      if(node.actionType){
        //this.set("hoveredWidget", node.actionType+"-action-info");
        //this.set("hoveredAction", node.getNodeDetail());
      }
    },
    hideNotification(){
      this.set("showNotificationPanel", false);
    },
    addBranch(node){
      this.addWorkflowBranch(node);
    },
    addDecisionBranch(settings){
      this.createSnapshot();
      this.get("workflow").addDecisionBranch(settings);
      this.rerender();
    },
    setNodeTransitions(transition){
      var currentNode= this.get("currentNode");
      if(transition.errorNode && transition.errorNode.isNew){
        this.get("workflow").addKillNode(currentNode,transition.errorNode);
        this.get("workflow.killNodes").push(transition.errorNode);
      }else {
        this.set('currentNode.errorNode', transition.errorNode);
      }
      currentNode.transitions.forEach((trans)=>{
        if(transition.okToNode && trans.condition !== 'error'){
          if(trans.targetNode.id !== transition.okToNode.id){
            trans.targetNode = transition.okToNode;
            this.showUndo('transition');
          }
        }
      }, this);
    },
    submitWorkflow(){
      this.set('dryrun', false);
      this.openJobConfig();
    },
    saveWorkflow(action){
      this.openSaveWorkflow();
      if(action === "saveDraft"){
        this.set("isDraft", true);
      }
      this.set('dryrun', false);
    },
    previewWorkflow(){
      this.set("showingPreview",false);
      this.get('workflowContext').clearErrors();
      var workflowGenerator=WorkflowGenerator.create({workflow:this.get("workflow"),
      workflowContext:this.get('workflowContext')});
      var workflowXml=workflowGenerator.process();
      if(this.get('workflowContext').hasErrors()){
        this.set('errors',this.get('workflowContext').getErrors());
      }else{
        this.set("previewXml",vkbeautify.xml(workflowXml));
        this.set("showingPreview",true);
      }
    },
    closePreview(){
      this.set("showingPreview", false);
    },
    downloadWorkflowXml(){
      this.get('workflowContext').clearErrors();
      var workflowGenerator=WorkflowGenerator.create({workflow:this.get("workflow"),
      workflowContext:this.get('workflowContext')});
      var workflowXml=workflowGenerator.process();
      if(this.get('workflowContext').hasErrors()){
        this.set('errors',this.get('workflowContext').getErrors());
      }else{
        this.workflowXmlDownload(workflowXml);
      }
    },
    closeWorkflowSubmitConfigs(){
      this.set("showingWorkflowConfigProps",false);
      this.set("showingSaveWorkflow",false);
    },
    closeSaveWorkflow(){
      this.set("showingSaveWorkflow",false);
    },
    importWorkflowTest(){
      var deferred = this.importSampleWorkflow();
      deferred.promise.then(function(data){
        this.resetDesigner();
        this.set("workflow",data);
        this.rerender();
        this.doValidation();
      }.bind(this)).catch(function(e){
        console.error(e);
      });
    },
    closeFileBrowser(){
      var self = this, path = this.get('workflowFilePath');
      this.set("showingFileBrowser",false);
      if(path){
        this.isDraftExists().promise.then(function(data){
          var draftData = JSON.parse(data);
          if(draftData.draftExists && draftData.isDraftCurrent){
            self.getDraftWorkflowData(path).promise.then(function(data){
              var workflowImporter=WorkflowJsonImporter.create({});
              var workflow=workflowImporter.importWorkflow(data);

              self.resetDesigner();
              self.set("workflow",workflow);
              self.rerender();
              self.doValidation();

            }.bind(this)).catch(function(data){

            });

            //deferred.resolve(workflow);
          } else {
            self.importWorkflow(path);
          }
        }.bind(this)).catch(function(data){
          //self.importWorkflow(path);
          console.error(data);
        });
      }
    },
    showFileBrowser(){
      this.set('showingFileBrowser', true);
    },
    closeActionSettingsFileBrowser() {
      var self = this;
      this.set("showingActionSettingsFileBrowser", false);
      if(this.get('actionSettingsFilePath')){
        var actionSettingsXmlDefered=this.getWorkflowFromHdfs(this.get('actionSettingsFilePath'));
        actionSettingsXmlDefered.promise.then(function(data){
          this.importActionSettingsFromString(data);
        }.bind(this)).catch(function(data){
          console.error(data);
          var stackTraceMsg = self.getStackTrace(data.responseText);
          self.set("errorMsg", "There is some problem while importing.Please try again.");
          self.showingErrorMsgInDesigner(data);
        });
      }
    },
    showActionSettingsFileBrowser() {
      this.set('showingActionSettingsFileBrowser', true);
    },
    closeImportActionNodeFileBrowser() {
      var self = this;
      this.set("showingImportActionNodeFileBrowser", false);
      if(this.get('actionNodeFilePath')){
        var actionSettingsXmlDefered=this.getWorkflowFromHdfs(this.get('actionNodeFilePath'));
        actionSettingsXmlDefered.promise.then(function(data){
          this.importActionNodeFromString(data);
        }.bind(this)).catch(function(data){
          console.error(data);
          var stackTraceMsg = self.getStackTrace(data.responseText);
          self.set("errorMsg", "There is some problem while importing.Please try again.");
          self.showingErrorMsgInDesigner(data);
        });
      }
    },
    showImportActionNodeFileBrowser() {
      this.set('showingImportActionNodeFileBrowser', true);
    },
    closeExportActionNodeFileBrowser() {
      var self = this;
      this.set("showingExportActionNodeFileBrowser", false);
      if(this.get('exportActionNodeFilePath')){
        self.exportActionNodeXml();
      }
    },
    showExportActionNodeFileBrowser() {
      this.set('showingExportActionNodeFileBrowser', true);
    },
    createNewWorkflow(){
      this.resetDesigner();
      this.rerender();
      this.set("workflowFilePath", "");
      this.$('#wf_title').focus();
    },
    conirmCreatingNewWorkflow(){
      this.set('showingConfirmationNewWorkflow', true);
    },
    showWorkflowGlobalProps(){
      if(this.get('workflow.globalSetting') !== null){
        this.set('globalConfig', Ember.copy(this.get('workflow.globalSetting')));
      }else{
        this.set('globalConfig', {});
      }
      this.set("showGlobalConfig", true);
    },
    closeWorkflowGlobalProps(){
      this.set("showGlobalConfig", false);
    },
    saveGlobalConfig(){
      this.set('workflow.globalSetting', Ember.copy(this.get('globalConfig')));
      this.set("showGlobalConfig", false);
    },
    closeWorkFlowParam(){
      this.set("showParameterSettings", false);
    },
    saveWorkFlowParam(){
      this.set('workflow.parameters', Ember.copy(this.get('parameters')));
      this.set("showParameterSettings", false);
    },
    zoomIn(){
      if(!this.get("zoomLevel")){
        this.resetZoomLevel();
      }
      this.decZoomLevel();
      var lev = this.get("zoomLevel") <= 0 ? 0.1 : this.get("zoomLevel");
      this.$("#flow-designer").css("transform", "scale(" + lev + ")");
    },
    zoomOut(){
      if(!this.get("zoomLevel")){
        this.resetZoomLevel();
      }
      this.incZoomLevel();
      var lev = this.get("zoomLevel") >= 1 ? 1 : this.get("zoomLevel");
      this.$("#flow-designer").css("transform", "scale(" + lev + ")");
    },
    zoomReset(){
      this.resetZoomLevel();
      this.$("#flow-designer").css("transform", "scale(" + 1 + ")");
    },
    resetLayout() {
      this.flowRenderer.resetLayout();
    },
    closeActionEditor (isSaved){
      this.send("hideNotification");
      if(isSaved){
        this.currentNode.onSave();
        this.doValidation();
      }	else {
        this.set('currentNode.domain',Ember.copy(this.get('clonedDomain')));
        this.set('currentNode.errorNode', this.get('clonedErrorNode'));
        if(this.currentNode.type === 'kill'){
          this.set('currentNode.killMessage', this.get('clonedKillMessage'));
        }
      }
      this.set('showActionEditor', false);
      this.rerender();
    },
    saveDraft(){
      this.persistWorkInProgress();
    },

    undoDelete () {
      var workflowImporter = WorkflowJsonImporter.create({});
      var workflow = workflowImporter.importWorkflow(this.get('workflowSnapshot'));
      this.resetDesigner();
      this.set("workflow", workflow);
      this.rerender();
      this.doValidation();
      this.set('undoAvailable', false);
    },

    registerAddBranchAction(component){
      this.set("addBranchListener",component);
    },
    dryRunWorkflow(){
      this.set('dryrun', true);
      this.openJobConfig();
    },
    scheduleWorkflow(){
      if(!this.get('workflowFilePath')){
        console.error("Workflow doesnot exists");
        return;
      }
      this.sendAction('openTab', 'coord', this.get('workflowFilePath'));
    },
    showAssetConfig(value) {
      this.set('assetConfig', {});
      this.set('showingAssetConfig', value);
    },
    saveAssetConfig() {
      var self=this;
      self.set("isAssetPublishing", true);
      var workflowGenerator = WorkflowGenerator.create({workflow:self.get("workflow"), workflowContext:self.get('workflowContext')});
      var actionNodeXml = workflowGenerator.getActionNodeXml(self.flowRenderer.currentCyNode.data().name, self.flowRenderer.currentCyNode.data().node.actionType);
      var dynamicProperties = self.get('propertyExtractor').getDynamicProperties(actionNodeXml);
      self.set('assetConfig.type', self.flowRenderer.currentCyNode.data().node.actionType);
      self.set('assetConfig.definition', actionNodeXml);
      var saveAssetConfigDefered=self.get("assetManager").saveAsset(self.get('assetConfig'), self.getRandomDataToDynamicProps(dynamicProperties));
      saveAssetConfigDefered.promise.then(function(data){
        self.set("isAssetPublishing", false);
      }.bind(this)).catch(function(data){
        self.set("isAssetPublishing", false);
        self.set("errorMsg", "There is some problem while saving asset. Please try again.");
        self.showingErrorMsgInDesigner(data);
      });
    },
    showAssetList(value) {
      var self=this;
      if (value) {
        var fetchAssetsDefered=self.get("assetManager").fetchAssets();
        fetchAssetsDefered.promise.then(function(response){
          self.set('assetList', JSON.parse(response).data);
          self.set('showingAssetList', value);
        }.bind(this)).catch(function(data){
          self.set("errorMsg", "There is some problem while fetching assets. Please try again.");
          self.showingErrorMsgInDesigner(data);
        });
      } else {
        self.set('showingAssetList', value);
      }
    },
    importAsset(asset) {
      var self=this;
      self.set("isAssetImporting", true);
      var importAssetDefered=self.get("assetManager").importAssetDefinition(asset.id);
      importAssetDefered.promise.then(function(response){
        var importedAsset = JSON.parse(response).data;
        self.importActionSettingsFromString(importedAsset.definition);
        self.set("isAssetImporting", false);
      }.bind(this)).catch(function(data){
        self.set("isAssetImporting", false);
        self.set("errorMsg", "There is some problem while importing asset. Please try again.");
        self.showingErrorMsgInDesigner(data);
      });
    },
    showAssetNodeList(value) {
      var self=this;
      if (value) {
        var fetchAssetsDefered=self.get("assetManager").fetchAssets();
        fetchAssetsDefered.promise.then(function(response){
          self.set('assetList', JSON.parse(response).data);
          self.set('showingAssetNodeList', value);
        }.bind(this)).catch(function(data){
          self.set("errorMsg", "There is some problem while fetching assets. Please try again.");
          self.showingErrorMsgInDesigner(data);
        });
      } else {
        self.set('showingAssetNodeList', value);
      }
    },
    importAssetNode(asset) {
      var self=this;
      self.set("isAssetImporting", true);
      var importAssetDefered=self.get("assetManager").importAssetDefinition(asset.id);
      importAssetDefered.promise.then(function(response){
        var importedAsset = JSON.parse(response).data;
        self.importActionNodeFromString(importedAsset.definition);
        self.set("isAssetImporting", false);
      }.bind(this)).catch(function(data){
        self.set("isAssetImporting", false);
        self.set("errorMsg", "There is some problem while importing asset. Please try again.");
        self.showingErrorMsgInDesigner(data);
      });
    }
  }
});
