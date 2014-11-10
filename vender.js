var SerialPort = require("serialport").SerialPort;

var vendSerialPort;

function connectToVend(onConnected){console.log('VENDER: Setting Serial Options');
    vendSerialPort = new SerialPort("/dev/tty.usbserial-FTCAK7FB", {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        bufferSize: 10000,
        parser: require("serialport").parsers.readline("\n\r")
    });

    vendSerialPort.on("open", function () {
        vendSerialPort.on('data', function(data) {
            processMessage(data);
        });
        console.log('VENDER: serial open');
        onConnected();
    });
}

var sessionStarted = false;

function startSession(onSessionStartedCallback){
    sessionStarted = false;
    console.log('session starting...');
    vendSerialPort.write([0x03, 0x00, 0x28], onSessionStarted); //START SESSION WITH $2 (0x28 -> 0x14 for $1)
    function onSessionStarted(err, results){
        console.log('VENDER: session started!');
        sessionStarted = true;
        onSessionStartedCallback();
    }
}

function checkSession(){
	return sessionStarted;
}

function sendVendApproved(){
    console.log('VENDER: sending vend approved...');
    vendSerialPort.write([0x05, 0x00, 0x07], function(err, results){
    });
}

function sendEndSession(callback){
    console.log('VENDER: sending end session...');
    vendSerialPort.write([0x07], function(err, results){
        console.log('VENDER: session ended.');
        sessionStarted = false;
        setTimeout(function(){
        	vendSerialPort.close();console.log('connection closed.');
        }, 2000);

        if(callback){
		callback();}
    });
}


function sendRequestEndSession(callback){
    console.log('VENDER: Trying to cancel session...');
    vendSerialPort.write([0x06], function(err, results){
        console.log('VENDER: 06-Vend Denied sent.');
    });
    vendSerialPort.write([0x08], function(err, results){
        console.log('VENDER: 08-Reader Cancel sent.');
    });
    vendSerialPort.write([0x13], function(err, results){
        console.log('VENDER: 13-Data Entry Cancel sent.');
    });
    vendSerialPort.write([0x00], function(err, results){
        console.log('VENDER: 00-Just Reset sent.');
        /*sessionStarted = false;*/
		console.log('VENDER: SessionStarted set to False');

		setTimeout(function(){

			vendSerialPort.write([0x07], function(err, results){
			console.log('VENDER: 07-End Session sent.');
			sessionStarted = false;
			});

		}, 2000);


        if(callback){
		callback();}
    });
}


function processMessage(data){
    console.log('processMessage() data: ',data);
    var dataArray = data.toString('utf8').split(" ");
    console.log('VENDER: got data', dataArray);
    console.log('dataArray.length: ', dataArray.length);
    if(dataArray.length && sessionStarted){

    	/*if(dataArray.length>=3){
    		if(dataArray[0]=='14' && dataArray[1]=='01' && dataArray[2] == '15'){
    			console.log('closing connection.');
    			vendSerialPort.close();

    		}
    	}*/

        if(dataArray.length == 8){ //data length of 7 suggested machine is returning user selection as 13 00 00 YY XX XX XX (YY is selection)
            console.log('VENDER: user selected ', dataArray[3]);
            if(sessionStarted){sendVendApproved();}
        }
        if(dataArray.length == 4){ // length 4 suggests "vended" signal - 13 04 XX (success) or 13 03 XX (failed) -- sent after vendApproved.
            if(dataArray[0]=='13'){
                if(dataArray[1]=='04'){ //success
                    console.log('VENDER: vend success!');
                    sendEndSession();
                }else if(dataArray[1]=='03'){ //failure
                    console.log('VENDER: vend failed!');
                    sendEndSession();
                }
            }
        }
    }
}

function sendRequest(req, res){
    var hex = [];
    hex.push(req.query.hex);
    console.log('hex',hex);
    if (hex.length > 0) {
        vendSerialPort.write(hex, function(err, results){
            console.log('err',err);
            if (err) {
                console.log('sendRequest err',err);
                res.send(err);
            } else {
                console.log('sendRequest results',results);
                res.send(results);
            }
        });
    } else {
        res.send('No hex code provided.');
    }
}

module.exports.sendRequestEndSession = sendRequestEndSession;
module.exports.checkSession = checkSession;
module.exports.connectToVend = connectToVend;
module.exports.startSession = startSession;
module.exports.endSession = sendEndSession;
module.exports.sendRequest = sendRequest;
