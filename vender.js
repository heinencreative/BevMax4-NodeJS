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
        console.log('startSession() results: ',results);
        console.log('startSession() error: ',err);
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
        console.log('sendVendApproved() results: ',results);
        console.log('sendVendApproved() error: ',err);
    });
}

function sendEndSession(callback){
    console.log('VENDER: sending end session...');
    vendSerialPort.write([0x07], function(err, results){
        console.log('VENDER: session ended.');
        console.log('sendEndSession() results: ',results);
        console.log('sendEndSession() error: ',err);
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
        console.log('sendRequestEndSession() 06-Vend Denied results: ',results);
        console.log('sendRequestEndSession() 06-Vend Denied error: ',err);
    });
    vendSerialPort.write([0x08], function(err, results){
        console.log('VENDER: 08-Reader Cancel sent.');
        console.log('sendRequestEndSession() 08-Reader Cancel results: ',results);
        console.log('sendRequestEndSession() 08-Reader Cancel error: ',err);
    });
    vendSerialPort.write([0x13], function(err, results){
        console.log('VENDER: 13-Data Entry Cancel sent.');
        console.log('sendRequestEndSession() 13-Data Entry Cancel results: ',results);
        console.log('sendRequestEndSession() 13-Data Entry Cancel error: ',err);
    });
    vendSerialPort.write([0x00], function(err, results){
        console.log('VENDER: 00-Just Reset sent.');
        console.log('sendRequestEndSession() 00-Just Reset results: ',results);
        console.log('sendRequestEndSession() 00-Just Reset error: ',err);
        /*sessionStarted = false;*/
		console.log('VENDER: SessionStarted set to False');

		setTimeout(function(){

			vendSerialPort.write([0x07], function(err, results){
			console.log('VENDER: 07-End Session sent.');
            console.log('sendRequestEndSession() 07-End Session results: ',results);
            console.log('sendRequestEndSession() 07-End Session error: ',err);
			sessionStarted = false;
			});

		}, 2000);


        if(callback){
		callback();}
    });
}


function processMessage(data){
    var dataArray = data.toString('utf8').split(" ");
    console.log('VENDER: got data', dataArray);
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

module.exports.sendRequestEndSession = sendRequestEndSession;
module.exports.checkSession = checkSession;
module.exports.connectToVend = connectToVend;
module.exports.startSession = startSession;
module.exports.endSession = sendEndSession;
