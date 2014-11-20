var express = require('express');
var app = express();
var vender = require('./js/vender.js');

app.get('/connect', vender.setup);

app.get('/startsession', vender.startSession);

app.get('/status', vender.status);

app.get('/endsession', vender.sendEndSession);

app.get('/requestendsession', vender.sendRequestEndSession);

app.get(/^(.+)$/, function(req, res) { res.sendfile('./' + req.params[0]); }); // TODO: is this necessary?

app.listen(3000);
