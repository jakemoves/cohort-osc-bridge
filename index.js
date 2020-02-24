// Copyright Jacob Niedzwiecki, 2019
// Released under the MIT License (see /LICENSE)
// Adapted & expanded from osc.js-examples (https://github.com/colinbdclark/osc.js-examples) by Colin Clark

// const request = require('request')
const osc = require('osc')
const fetch = require('node-fetch')

/****************
 * OSC Over UDP *
 ****************/

var serverURL = "https://new.cohort.rocks/api/v2"
var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Imhhbm5haGtpcmJ5IiwiaWF0IjoxNTgyNTA4NDA2fQ.Zs6rW89Bg5FaFe6hHUM0di5PktddZp0xWzB_B32wE9g" // hannahkirby

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

  if(oscMessage.address != '/cohort'){
    return;
  }

  let payload = {
    "mediaDomain": oscMessage.args[0],
    "cueNumber": oscMessage.args[1],
    "cueAction": oscMessage.args[2],
    "targetTags": ["all"]
  };

  if(oscMessage.args.length == 4){
    payload.targetTags = [oscMessage.args[3]];
  }
  
  console.log("Sending cue: ")
  console.log(payload)
  fetch(serverURL + '/occasions/1/broadcast', {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'JWT ' + token
    },
    body: JSON.stringify(payload)
  }).then( response => {
    console.log("Response code: " + response.status)
    if(response.status == 200){
      response.json().then( results => {
        console.log("Results: successful")
        // console.log(results)
      })
    } else {
      response.text().then( error => {
        console.log(error)
      })
    }
  }).catch( error => {
    console.log(error)
  })
  // request.post({
  //     url: serverURL + '/occasions/1/broadcast',
  //     headers: [{
  //         name: 'Content-Type',
  //         value: 'application/json'
  //     },{
  //         name: 'Authorization',
  //         value: 'JWT ' + token
  //     }],
  //     body: payload,
  //     json: true
  // }, function(error, response, body){
  //     if(error){ console.log(error) }
  //     console.log(response.statusCode);
  //     console.log(body);
  // })
});

udpPort.on("error", function (err) {
    console.log(err);
});

udpPort.open();