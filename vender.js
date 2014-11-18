var SerialPort = require("serialport").SerialPort;

var vendSerialPort,
    vendFailed = false,
    sessionStarted = false,
    machineReady = false;

function setup(onConnected){
    console.log('vender.js: Setting Up Serial Options');

    vendSerialPort = new SerialPort("/dev/tty.usbserial-FTCAK7FB", {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        bufferSize: 10000,
        parser: require("serialport").parsers.readline("\n\r")
    },false);

    vendSerialPort.open( function (error) {
        if (error) {
            console.log('vender.js: Failed to open serial port: '+error);
        } else{
            console.log('vender.js: serial open');
            vendSerialPort.on('data', function(data) {
                processMessage(data);
            });
            onConnected();
            // Send reset after making connection.
            sendReset();
        }
    });

}

function checkSession(){
	return sessionStarted;
}


function processMessage(data){
    var dataArray = data.trim().toString('utf8').split(" ");

    switch (dataArray.length) {
        case -1:
            console.log("VMC: Something is truly fucked up.");
            break;
        case 0:
            console.log("VMC: Something is really fucked up.");
            break;
        case 1: //Acknowledged
            if(dataArray[0] == "00"){
                console.log("VMC: ACK.");

                if(vendFailed && !sessionStarted){
                    console.log("VMC: Vend Failed. Please attempt a new session.");
                    vendFailed = false;
                }
            } else {
               console.log("VMC: Unknown message: " + data);
            }

            break;
        case 2: //NOT USED
           console.log("VMC: Unknown message: " + data);
            break;
        case 3: //READER ENABLE, READER DISABLE, VEND FAILED, VEND COMPLETE
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "03"){ //FAILED
                   console.log("VMC: Vend Failed (e.g. empty row selected).");
                   vendFailed = true;
                } else if(dataArray[1] == "04"){ //COMPLETE
                    console.log("VMC: Session Complete.");
                    //debug(dataArray);
                    sendEndSession();
                } else {
                   console.log("VMC: Unknown message: " + data);
                }

            } else if(dataArray[0] == "14"){ //READER
                if(dataArray[1] == "01"){ //ENABLE
                    console.log("VMC: Reader Enable.");
                    machineReady = true;
                } else if(dataArray[1] == "00"){ //DISABLE
                    console.log("VMC: Reader Disable.");
                    machineReady = false;
                } else {
                   console.log("VMC: Unknown message: " + data);
                }

            } else {
               console.log("VMC: Unknown message: " + data);
            }
            break;
        case 4:
           console.log("VMC: Unknown message: " + data);
            break;
        case 5: //VEND SUCCESS, VEND FAILED
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "02"){ //SUCCESS
                    console.log("VMC: Vend Success.");
                } else {
                   console.log("VMC: Unknown message: " + data);
                }
            } else {
               console.log("VMC: Unknown message: " + data);
            }
            break;
        case 6:
           console.log("VMC: Unknown message: " + data);
            break;
        case 7: //VEND REQUEST
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "00"){ //REQUEST
                    decodeChoice(dataArray[5]);
                } else {
                    console.log("VMC: Unknown message: " + data);
                }

            } else {
               console.log("VMC: Unknown message: " + data);
            }
            break;
        default:
           console.log("VMC: Unknown message: " + data);
            break;
    }
}

// Convert and log the vend selection code
function decodeChoice(choice) {
    var hex = "0x"+choice;
    var ret = "VMC: They chose ";

    var lc = "";
    var n = parseInt(hex,16);
    var inBounds = true;

    if(n < 10){
        ret += "A-" + n;
        lc = "A-" + n;
    } else if(n < 19){
        ret += "B-" + (n - 9);
        lc = "B-" + (n - 9);
    } else if(n < 28){
        ret += "C-" + (n - 18);
        lc = "C-" + (n - 18);
    } else if(n < 37) {
        ret += "D-" + (n - 27);
        lc = "D-" + (n - 27);
    } else if(n < 46){
        ret += "E-" + (n - 36);
        lc = "E-" + (n - 36);
    } else {
        ret += "out of bounds";
        lc = "error";
        inBounds = false;
    }

    ret += ".";
    console.log(ret);

    // lastChoice = lc;

    if(inBounds){
        sendVendApproved();
    } else {
        sendVendDeny();
    }
}

function startSession(callback){
    console.log('startSession machineReady: ', machineReady);
    console.log('startSession sessionStarted: ', sessionStarted);
    // Begin session only if machine is ready an no session has already been started
    if (machineReady && !sessionStarted) {
        sendBeginSession();
        if(callback){
        callback();}
    } else {
        console.log('vender.js: Cannot start session, not ready or session already active.');
    };
}

function sendBeginSession(){
    console.log('vender.js: session starting...');
    console.log('sendBeginSession machineReady',machineReady);
    if (machineReady) {
        vendSerialPort.write([0x03, 0x00, 0x28], function(err, results){
            //START SESSION WITH $2 (0x28 -> 0x14 for $1)
            console.log('PC2MDB: sent begin session.');
            sessionStarted = true;
            vendFailed = false;
        });
    } else {
        console.log('vender.js: Machine is not ready. Aborting');
    }
}

function sendVendApproved(){
    console.log('vender.js: Trying to approve vend...');
    vendSerialPort.write([0x05], function(){
        console.log('PC2MDB: sent vend approved...');
    });
}

function sendEndSession(callback){
    console.log('vender.js: sending end session...');
    vendSerialPort.write([0x07], function(){
        console.log('PC2MDB: 07-Sent end session.');
        sessionStarted = false;
        if(callback){
        callback();}
    });
}

function sendRequestEndSession(callback){
    console.log('vender.js: Trying to cancel session...');
    vendSerialPort.write([0x04], function(){
        console.log('PC2MDB: 04-Vend Session Cancel Request sent.');
        sessionStarted = false;
    });
}

function sendReset(){
    console.log('vender.js: Trying to reset session...');
    vendSerialPort.write([0x00], function(){
        console.log('PC2MDB: 00-Just Reset sent.');
        sessionStarted = false;
    });
}

function sendVendDeny(){
    console.log('vender.js: Trying to deny vend...');
    vendSerialPort.write([0x06], function(){
        console.log('PC2MDB: 06-Vend Denied sent.');
    });
}

// sendRequest() is used to send debug requests, not used in production app
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
module.exports.setup = setup;
module.exports.startSession = startSession;
module.exports.endSession = sendEndSession;
module.exports.sendRequest = sendRequest;
