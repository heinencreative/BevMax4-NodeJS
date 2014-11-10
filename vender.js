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
    var dataArray = data.trim().toString('utf8').split(" ");

    switch (dataArray.length()) {
        case -1:
            console.log("Vender: Something is truly fucked up.");
            break;
        case 0:
            console.log("Vender: Something is really fucked up.");
            break;
        case 1: //ACK NACK
            if(dataArray[0] == "00"){
                console.log("Vender: ACK.");
                if(bVendFailed && !bSession){
                   console.log("Vender: D: Vend Failed.  Please attempt a new session.");
                    // bVendFailed = false;
                }
            } else {
               console.log("Vender: Unknown message: " + _message);
            }

            break;
        case 2: //NOT USED
           console.log("Vender: Unknown message: " + _message);
            break;
        case 3: //READER ENABLE, READER DISABLE, VEND FAILED, VEND COMPLETE
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "03"){ //FAILED
                   console.log("Vender: Vend Failed.");
                   // bVendFailed = true;
                } else if(dataArray[1] == "04"){ //COMPLETE
                    console.log("Vender: Session Complete.");
                    //debug(dataArray);
                    // sendEndSession();
                    console.log("Vender: SESSION COMPLETE");
                } else {
                   console.log("Vender: Unknown message: " + _message);
                }

            } else if(dataArray[0] == "14"){ //READER
                if(dataArray[1] == "01"){ //ENABLE
                    console.log("Vender: Reader Enable.");
                    // bReady = true;
                } else if(dataArray[1] == "00"){ //DISABLE
                    console.log("Vender: Reader Disable.");
                    // bReady = false;
                } else {
                   console.log("Vender: Unknown message: " + _message);
                }

            } else {
               console.log("Vender: Unknown message: " + _message);
            }
            break;
        case 4:
           console.log("Vender: Unknown message: " + _message);
            break;
        case 5: //VEND SUCCESS, VEND FAILED
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "02"){ //SUCCESS
                    console.log("Vender: Vend Success.");
                } else {
                   console.log("Vender: Unknown message: " + _message);
                }
            } else {
               console.log("Vender: Unknown message: " + _message);
            }
            break;
        case 6:
           console.log("Vender: Unknown message: " + _message);
            break;
        case 7: //VEND REQUEST
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "00"){ //REQUEST
                    // decodeChoice(dataArray[5]);
                } else {
                   console.log("Vender: Unknown message: " + _message);
                }

            } else {
               console.log("Vender: Unknown message: " + _message);
            }
            break;
        default:
           console.log("Vender: Unknown message: " + _message);
            break;
    }
}

function sendRequest(req, res){
    var hex = [];
    hex.push(req.query.hex);
    console.log('hex',hex);
    var data = new Buffer(hex);
    console.log('sendRequest data',data);
    if (hex.length > 0) {
        vendSerialPort.write(data, function(err, results){
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
