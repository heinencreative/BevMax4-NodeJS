var express = require('express');
var app = express();
var vender = require('./vender.js');


app.get('/connect', function(req, res){
	res.send('connection happens when session starts...');
    //vender.connectToVend(function(){console.log("connected to vending machine!");});
});

app.get('/startsession', function(req, res){
	vender.connectToVend(function(){console.log("connected to vending machine!");
		vender.startSession(function(){console.log("session started! ready for selection...");
			res.send('done');
		});
	});
});

app.get('/checksession', function(req, res){
    res.send(vender.checkSession());
});

app.get('/endsession', function(req, res){
    vender.endSession(function(){console.log("session ended, connection closed");
    res.send('done');
	});
});

app.get('/requestendsession', function(req, res){
	/*vender.connectToVend(function(){console.log("connected to vending machine!");*/
		vender.sendRequestEndSession(function(){
		res.send('done');
		});
	/*});*/
});

// Used for debugging cashless device
app.route('/sendRequest')
  .get(vender.sendRequest);

app.get(/^(.+)$/, function(req, res) { res.sendfile('./' + req.params[0]); });

app.listen(3000);


