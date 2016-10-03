/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express  = require('express'),
  app        = express(),
  extend     = require('util')._extend,
  pkg        = require('./package.json'),
  training   = require('./training/setup'),
  Q          = require('q');


// Bootstrap application settings
require('./config/express')(app);

var log = console.log.bind(null, '  ');
var apis = null;

// promises
var converse = null;

// Services Override - to access dialog service in enterprise
servicesOverride();

// create the promises with the result
training.train(function(err) {
	if (err){
    console.log('ERROR:', err.error);
  }

  apis = require('./api/services');

  // start the conversation
  converse = Q.nfbind(apis.dialog.conversation.bind(apis.dialog));

});

// create the conversation
app.post('/api/create_conversation', function(req, res, next) {
  converse(req.body)
  .then(function(result){
    res.json(result[0]);
  })
  .catch(next);
});

// converse
app.post('/api/conversation', function(req, res, next) {

  return converse(req.body)
  .then(function(result) {
      var conversation = result[0];
      res.json(conversation);
    }).catch(next);

});

// Overriding VCAP_SERVICES environment variable
function servicesOverride() {
    process.env['VCAP_SERVICES'] = process.env.services_override;
};

/**
 * Returns the dialog_id to the user.
 */
 app.get('/api/services', function(req, res) {
  res.json({
    dialog_id: apis ? apis.dialog_id : 'Unknown'
  });
});

// error-handler application settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
var host = process.env.VCAP_APP_HOST || 'localhost';
app.listen(port);

console.log(pkg.name + ':' + pkg.version, host + ':' + port);
