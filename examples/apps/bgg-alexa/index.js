'use strict';

	module.change_code = 1;

	var _ = require('lodash');

	var Alexa = require('alexa-app');

	var app = new Alexa.app('bgg-alexa');

	var db_config = require('./db_config');
	var node_env = process.env.NODE_ENV.trim();
	var db_collection = db_config[node_env];

	var mongo = require('mongodb');
	var monk = require('monk');

	var mongodb_config = (process.env.mongodb) ? process.env.mongodb : process.argv[2];
	var mongo_url = 'mongodb://'+mongodb_config;
  var bgg = require('bgg');
	var db = monk(mongo_url);

	app.launch(function(req, res) {
    var prompt = 'What kind of game do you want to play?';
    console.log(req.userId);
    res.say(prompt).reprompt(prompt).shouldEndSession(false);

	});

  var games = [];

  app.intent('gameSuggestion', {
     'slots': {
       'CATEGORIES': 'PHONETIC_ALPHABET'
     },
      'utterances': ['{category} {-|CATEGORIES}']
    },

    function(req, res) {
      var prompt = '';
      var CATEGORIES = req.slot('CATEGORIES');
      res.say('You want  '+CATEGORIES+ ' games?').shouldEndSession(false).send();

      res.say('I will find your game collection.').shouldEndSession(false).send();

      lookupBBGId(res, req.userId, CATEGORIES);

    }

  );

	function lookupBBGId(res, alexaId, searchTerm){
		var user_coll = db.get(db_collection);

	  user_coll.find({ "alexaId" : alexaId }).then(function (data) {
      confirmCollectionFound(res, data, searchTerm);
    }, function (err) {
      console.error(err) ;
    })
	}

  function confirmCollectionFound(res, data, searchTerm)
  {
    var bggId = data[0].bggId;

    if(bggId === undefined){
      res.say('I couldn\t find your collection. What is your Board Game Geek username?').shouldEndSession(false).send();
    } else {
      var prompt = 'Found it. Now searching for '+searchTerm+ ' games';

      console.log(prompt);
      res.say(prompt).shouldEndSession(false).send();
      bgg('collection', {username: bggId, own: 1}).then(function(results){
        console.log(results);
      });
    }
    return false;

  }

  app.intent('saveBGGUsername', {
     'slots': {
       'USERNAME_LETTERS': 'PHONETIC_ALPHABET'
     },
      'utterances': ['{my} {name|username} is {-|USERNAME_LETTERS}']
    },

    function(req, res) {

      var USERNAME_LETTERS = req.slot('USERNAME_LETTERS');

      return false;

    }

  );

	module.exports = app;