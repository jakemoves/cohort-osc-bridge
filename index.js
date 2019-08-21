const request = require('request')
const osc = require('osc')

/****************
 * OSC Over UDP *
 ****************/

var getIPAddresses = function () {
    var os = require("os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

    for (var deviceName in interfaces) {
        var addresses = interfaces[deviceName];
        for (var i = 0; i < addresses.length; i++) {
            var addressInfo = addresses[i];
            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }

    return ipAddresses;
};

var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
});

udpPort.on("ready", function () {
    var ipAddresses = getIPAddresses();

    console.log("Listening for OSC over UDP.");
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", udpPort.options.localPort);
    });
});

udpPort.on("message", function (oscMessage) {
    console.log(oscMessage);

    let payload = {
        "mediaDomain": oscMessage.args[0],
        "cueNumber": oscMessage.args[1],
        "cueAction": oscMessage.args[2],
        "targetTags": ["all"]
    };

    console.log(payload)
    
    request.post({
        url: 'https://cohort.rocks/api/v1/events/6/broadcast',
        headers: [{
            name: 'content-type',
            value: 'application/json'
        }],
        body: payload,
        json: true
    }, function(error, response, body){
        if(error){ console.log(error) }
        console.log(response.statusCode);
        console.log(body);
    })
});

udpPort.on("error", function (err) {
    console.log(err);
});

udpPort.open();