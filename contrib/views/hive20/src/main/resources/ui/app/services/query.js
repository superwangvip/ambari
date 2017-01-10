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

import Ember from 'ember';

export default Ember.Service.extend({

  store: Ember.inject.service(),

  createJob(payload){
    return new Promise( (resolve, reject) => {
      this.get('store').adapterFor('query').createJob(payload).then(function(data) {
        resolve(data);
      }, function(err) {
        reject(err);
      });
    });
  },
  getJob(jobId, dateSubmitted, firstCall){
    let self = this;
    return new Promise( (resolve, reject) => {
      this.get('store').adapterFor('query').getJob(jobId, dateSubmitted, firstCall).then(function(data) {
        resolve(data);
      }, function(err) {
          reject(err);
      });
    });
  }

});
