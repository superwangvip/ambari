#!/bin/bash
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License

AMBARI_PATH=/root/ambari
LOGSEARCH_SERVER_PATH=$AMBARI_PATH/ambari-logsearch/ambari-logsearch-portal/target/package
LOGFEEDER_PATH=$AMBARI_PATH/ambari-logsearch/ambari-logsearch-logfeeder/target/package
SOLR_LOCATION=/root/solr-$SOLR_VERSION.tgz
SOLR_SERVER_LOCATION=/root/solr-$SOLR_VERSION
ZKCLI=$SOLR_SERVER_LOCATION/server/scripts/cloud-scripts/zkcli.sh

command="$1"

function build_all() {
  echo "build all"
  cd $AMBARI_PATH/ambari-logsearch && mvn clean package -DskipTests && mvn -pl ambari-logsearch-logfeeder clean package -DskipTests
}

function create_config() {
  mkdir /root/config

  mkdir /root/config/solr
  cp /root/test-config/solr/log4j.properties /root/config/solr/
  cp /root/test-config/solr/zoo.cfg /root/config/solr/
  cp /root/test-config/solr/solr.xml /root/config/solr/
  if [ $LOGSEARCH_SOLR_SSL_ENABLED == 'true' ]
  then
    cp /root/test-config/solr/solr-env-ssl.sh /root/config/solr/solr-env.sh
  else
    cp /root/test-config/solr/solr-env.sh /root/config/solr/solr-env.sh
  fi

  mkdir /root/config/logfeeder
  cp -r /root/test-config/logfeeder/* /root/config/logfeeder/

  mkdir /root/config/logsearch
  cp /root/test-config/logsearch/log4j.xml /root/config/logsearch/
  cp /root/test-config/logsearch/logsearch-env.sh /root/config/logsearch/
  if [ $LOGSEARCH_HTTPS_ENABLED == 'true' ]
  then
    cp /root/test-config/logsearch/logsearch-https.properties /root/config/logsearch/logsearch.properties
  else
    cp /root/test-config/logsearch/logsearch.properties /root/config/logsearch/logsearch.properties
  fi

  chmod -R 777 /root/config
}

function generate_keys() {
  IP=`hostname --ip-address`
  echo "generating stores for IP: $IP"
  mkdir /root/config/ssl
  keytool -genkeypair -alias logsearch -keyalg RSA -keysize 2048 -keypass bigdata -storepass bigdata -validity 9999 -keystore /root/config/ssl/logsearch.keyStore.jks -ext SAN=DNS:localhost,IP:127.0.0.1,IP:$IP -dname "CN=Common Name, OU=Organizational Unit, O=Organization, L=Location, ST=State, C=Country" -rfc
  cp /root/config/ssl/logsearch.keyStore.jks /root/config/ssl/logsearch.trustStore.jks
}

function start_solr() {
  echo "Starting Solr..."
  /root/solr-$SOLR_VERSION/bin/solr start -cloud -s /root/logsearch_solr_index/data -verbose
  touch /var/log/ambari-logsearch-solr/solr.log

  if [ $LOGSEARCH_SOLR_SSL_ENABLED == 'true'  ]
  then
    echo "Setting urlScheme as https and restarting solr..."
    $ZKCLI -zkhost localhost:9983 -cmd clusterprop -name urlScheme -val https
    /root/solr-$SOLR_VERSION/bin/solr stop
    /root/solr-$SOLR_VERSION/bin/solr start -cloud -s /root/logsearch_solr_index/data -verbose
  fi
}

function start_logsearch() {
  echo "Upload configuration sets ..."

  $ZKCLI  -zkhost localhost:9983 -cmd upconfig -confdir $LOGSEARCH_SERVER_PATH/solr_configsets/audit_logs/conf -confname audit_logs
  $ZKCLI  -zkhost localhost:9983 -cmd upconfig -confdir $LOGSEARCH_SERVER_PATH/solr_configsets/hadoop_logs/conf -confname hadoop_logs
  $ZKCLI  -zkhost localhost:9983 -cmd upconfig -confdir $LOGSEARCH_SERVER_PATH/solr_configsets/history/conf -confname history
  
  $LOGSEARCH_SERVER_PATH/run.sh
  touch /var/log/ambari-logsearch-portal/logsearch-app.log
}

function start_logfeeder() {
  $LOGFEEDER_PATH/run.sh
  touch /var/log/ambari-logsearch-logfeeder/logsearch-logfeeder.log
}

function log() {
  component_log=${COMPONENT_LOG:-"logsearch"}
  case $component_log in
    "logfeeder")
      tail -f /var/log/ambari-logsearch-logfeeder/logsearch-logfeeder.log
     ;;
    "solr")
      tail -f /var/log/ambari-logsearch-solr/solr.log
     ;;
     *)
      tail -f /var/log/ambari-logsearch-portal/logsearch-app.log
     ;;
  esac
}

create_config
generate_keys
start_solr
start_logsearch
start_logfeeder
log

