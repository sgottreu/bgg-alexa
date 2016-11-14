'use strict';

	module.change_code = 1;

	var _ = require('lodash');

	var Alexa = require('alexa-app');

	var app = new Alexa.app('bgg-alexa');

	var db_collection = 'bgg-alexa';

  var xmldoc = require('xmldoc');
  var http = require('http');

	var mongo = require('mongodb');
	var monk = require('monk');

	var mongodb_config = (process.env.mongodb) ? process.env.mongodb : process.argv[2];
	var mongo_url = 'mongodb://'+mongodb_config;

	var db = monk(mongo_url);

    // "chai": "^3.5.0",
    // "chai-as-promised": "^6.0.0",

    // "mocha": "^3.1.2",

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

      parseUserCollection('http://www.boardgamegeek.com/xmlapi2/collection?username='+bggId+'&owned=1', searchTerm);

    }
    return false;

  }

var parseUserCollection = function(url, searchTerm){
  http.get(url, function(res) {
    let statusCode = res.statusCode;
    let contentType = res.headers['content-type'];
    let error;
    if (statusCode !== 200) {
      error = new Error(`Request Failed.\n` +
                        `Status Code: ${statusCode}`);
    // } else if (!/^text\/xml/.test(contentType)) {
    //   error = new Error(`Invalid content-type.\n` +
    //                     `Expected application/json but received ${contentType}`);
     }
    if (error) {
      console.log(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', function(chunk){ rawData += chunk });
    res.on('end', function() {
      try {
        var doc = new xmldoc.XmlDocument(rawData);

        let ids = [];

        doc.eachChild(function(child, index, arr){
          let game_name = child.childNamed('name');
          games[child.attr.objectid] = { id: child.attr.objectid, name: game_name.val };
          ids.push(child.attr.objectid);
        });
        findCatMechMatches('http://www.boardgamegeek.com/xmlapi2/thing?id='+ids.join(','), searchTerm);
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', function(e){
    console.log(`Got error: ${e.message}`);
  });
}

function findCatMechMatches(url, searchTerm){
  http.get(url, function(res) {
    let statusCode = res.statusCode;
    let contentType = res.headers['content-type'];
    let error;
    if (statusCode !== 200) {
      error = new Error(`Request Failed.\n` +
                        `Status Code: ${statusCode}`);
    // } else if (!/^text\/xml/.test(contentType)) {
    //   error = new Error(`Invalid content-type.\n` +
    //                     `Expected application/json but received ${contentType}`);
    }

    if (error) {
      console.log(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', function(chunk){ rawData += chunk });
    res.on('end', function() {
      try {
        var doc = new xmldoc.XmlDocument(rawData);

        let game_matches = [];

        doc.eachChild(function(child, index, arr){
          let catMechs = child.childrenNamed('link');
          for(var x=0,len=catMechs.length;x<len;x++){
            if(catMechs[x].attr.type == 'boardgamecategory' || catMechs[x].attr.type == 'boardgamemechanic' || catMechs[x].attr.type == 'boardgamefamily'){
              if(catMechs[x].attr.value.toLowerCase() == searchTerm.toLowerCase() ){
                game_matches.push( games[child.attr.id] );
              }
            }
          }
        });
        var prompt = 'I found '+game_matches.length+' matches for your search of '+searchTerm+ ' games.';
        console.log(prompt);
        res.say(prompt).shouldEndSession(false).send();
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', function(e){
    console.log(`Got error: ${e.message}`);
  });
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