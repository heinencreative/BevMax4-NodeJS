var SerialPort = require("serialport").SerialPort;

var vendSerialPort,
    VendFailed = false,
    sessionStarted = false,
    machineReady = false;

function setup(onConnected){
    console.log('VENDER: Setting Up Serial Options');

    vendSerialPort = new SerialPort("/dev/tty.usbserial-FTCAK7FB", {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        bufferSize: 10000,
        parser: require("serialport").parsers.readline("\n\r")
    },false);

    vendSerialPort.open( function (error) {
        if (error) {
            console.log('Vender: Failed to open serial port: '+error);
        } else{
            console.log('VENDER: serial open');
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
    console.log('processMessage() data: ',data);
    var dataArray = data.trim().toString('utf8').split(" ");

    switch (dataArray.length) {
        case -1:
            console.log("Vender: Something is truly fucked up.");
            break;
        case 0:
            console.log("Vender: Something is really fucked up.");
            break;
        case 1: //Acknowledged
            if(dataArray[0] == "00"){
                console.log("Vender: ACK.");
                if(VendFailed && !sessionStarted){
                    console.log("Vender: D: Vend Failed.  Please attempt a new session.");
                    VendFailed = false;
                }
            } else {
               console.log("Vender: Unknown message: " + data);
            }

            break;
        case 2: //NOT USED
           console.log("Vender: Unknown message: " + data);
            break;
        case 3: //READER ENABLE, READER DISABLE, VEND FAILED, VEND COMPLETE
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "03"){ //FAILED
                   console.log("Vender: Vend Failed.");
                   VendFailed = true;
                } else if(dataArray[1] == "04"){ //COMPLETE
                    console.log("Vender: Session Complete.");
                    //debug(dataArray);
                    sendEndSession();
                    console.log("Vender: SESSION COMPLETE");
                } else {
                   console.log("Vender: Unknown message: " + data);
                }

            } else if(dataArray[0] == "14"){ //READER
                if(dataArray[1] == "01"){ //ENABLE
                    console.log("Vender: Reader Enable.");
                    machineReady = true;
                } else if(dataArray[1] == "00"){ //DISABLE
                    console.log("Vender: Reader Disable.");
                    machineReady = false;
                } else {
                   console.log("Vender: Unknown message: " + data);
                }

            } else {
               console.log("Vender: Unknown message: " + data);
            }
            break;
        case 4:
           console.log("Vender: Unknown message: " + data);
            break;
        case 5: //VEND SUCCESS, VEND FAILED
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "02"){ //SUCCESS
                    console.log("Vender: Vend Success.");
                } else {
                   console.log("Vender: Unknown message: " + data);
                }
            } else {
               console.log("Vender: Unknown message: " + data);
            }
            break;
        case 6:
           console.log("Vender: Unknown message: " + data);
            break;
        case 7: //VEND REQUEST
            if(dataArray[0] == "13"){ //VEND
                if(dataArray[1] == "00"){ //REQUEST
                    decodeChoice(dataArray[5]);
                } else {
                    console.log("Vender: Unknown message: " + data);
                }

            } else {
               console.log("Vender: Unknown message: " + data);
            }
            break;
        default:
           console.log("Vender: Unknown message: " + data);
            break;
    }
}

// Convert and log the vend selection code
function decodeChoice(choice) {
    var hex = "0x"+choice;
    var ret = "Vender: They chose ";

    var lc = "";
    var n = parseInt(hex,16);
    var inBounds = true;

    console.log('choice',choice);
    console.log('choice typeof', typeof choice);
    console.log('hex',hex);
    console.log('n',n);
    console.log('n lt 10',n < 10);
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
    console.log("Vender: " + ret);

    // lastChoice = lc;

    if(inBounds){
        sendVendApproved();
    } else {
        sendVendDeny();
    }
}

function startSession(){
    console.log('startSession machineReady: ', machineReady);
    if (machineReady && vendSerialPort) {
        sendBeginSession();
    } else {
        console.log('Vender: Cannot start session, not ready.');
    };
}

function sendBeginSession(){
    console.log('session starting...');
    if (machineReady) {
        vendSerialPort.write([0x03, 0x00, 0x28], function(err, results){
            //START SESSION WITH $2 (0x28 -> 0x14 for $1)
            console.log('VENDER: session started!');
            sessionStarted = true;
            VendFailed = false;
        });
    } else {
        console.log('Vender: Machine is not ready. Aborting');
    }
}

function sendVendApproved(){
    vendSerialPort.write([0x05, 0x00, 0x07], function(err, results){
        console.log('VENDER: sent vend approved...');
    });
}

function sendEndSession(callback){
    console.log('VENDER: sending end session...');
    vendSerialPort.write([0x07], function(err, results){
        console.log('VENDER: session ended.');
        sessionStarted = false;
        if(callback){
        callback();}
    });
}

function sendRequestEndSession(callback){
    console.log('VENDER: Trying to cancel session...');
    vendSerialPort.write([0x04], function(err, results){
        console.log('VENDER: 06-Vend Session Cancel Request sent.');
        sessionStarted = false;
    });
}

function sendReset(){
    console.log('VENDER: Trying to reset session...');
    vendSerialPort.write([0x00], function(err, results){
        console.log('VENDER: 00- Just Reset sent.');
        sessionStarted = false;
    });
}

function sendVendDeny(){
    vendSerialPort.write([0x06], function(err, results){
        console.log('VENDER: 06-Vend Denied sent.');
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
