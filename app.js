// Copyright Jacob Niedzwiecki, 2019
// Released under the MIT License (see /LICENSE)
// Adapted & expanded from osc.js-examples (https://github.com/colinbdclark/osc.js-examples) by Colin Clark

const osc = require('osc')
const fetch = require('node-fetch')
const inquirer = require('inquirer')

/****************
 * OSC Over UDP *
 ****************/

var serverURL, serverMode, apiToken


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

udpPort.on("ready", async () => {
  console.log(`\n`)
  try {
    let answer1 = await inquirer.prompt(
      [{
        type: "list",
        name: "serverMode",
        message: "Are you using Cohort in online or offline mode?",
        choices: [{
          name: "Online",
          value: "online",
          short: "online"
        },{
          name: "Offline",
          value: "offline",
          short: "offline"
        }]
      }]
    )

    if(answer1.serverMode == "online"){
      serverMode = "online"
      serverURL = "https://new.cohort.rocks/api/v2"
    
      console.log(`\n`)
      inquirer.prompt([{
        type: "input",
        name: "userToken",
        message: "Please paste your API token:",
        default: ""
      }]).then(answers => {
        authenticate(answers.userToken)
        finishLaunch() // TODO make async
      }).catch(error => {
        console.log(error)
      })

    } else if(answer1.serverMode == "offline"){
      serverMode = "offline"
      serverURL = "http://localhost:3000/api/v2"

      finishLaunch()
    }

      
    function finishLaunch (){
      const ipAddresses = getIPAddresses();

      console.log(`\nListening for OSC over UDP on IP addresses:`);
      ipAddresses.forEach(function (address) {
        console.log("  Host (IP):", address + ", Port:", udpPort.options.localPort);
      });

      console.log(`\nTo quit, hit Control+C`)
    }
  }
  catch (error) {
    if(error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
      console.log("Prompt couldn't be rendered in the current environment")
    } else {
      // Something else went wrong
      console.log(error)
    }
  }
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
    headers: headers(apiToken),
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

  // changed to fetch for offline above // online
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

getHeaders = (token) => {
  let headers = {
    'Content-Type': 'application/json'
  }

  if(serverMode == "online"){
    headers['Authorization'] = 'JWT ' + token
  }
  return headers
}

authenticate = (userToken) => {
  const headers = getHeaders(userToken)

  fetch(serverURL + '/events', {
    method: 'GET', 
    headers: headers
  }).then( response => {
    // console.log("Response code: " + response.status)
    if(response.status == 200){
      response.json().then( results => {
        // console.log("Results: successful")
        // console.log(results)
        console.log("Logged in to Cohort server")
      })
    } else {
      response.text().then( error => {
        console.log(error)
      })
    }
  }).catch( error => {
    console.log(error)
  })
  // inquirer.prompt([
  //   {
  //     type: "list",
  //     name: "serverMode",
  //     message: "Are you using Cohort in online or offline mode?",
  //     choices: [{
  //       name: "Online",
  //       value: "online",
  //       short: "online"
  //     },{
  //       name: "Offline",
  //       value: "offline",
  //       short: "offline"
  //     }
  //   ]}
  // ]).then(answers => {
  //   if(answers.serverMode == "online"){
  //     serverUrL = "https://new.cohort.rocks/api/v2"
  //     authenticate()

  //   } else if(answers.serverMode == "offline"){
  //     serverURL = "http://localhost:3000/api/v2"
  //   }

  //   const ipAddresses = getIPAddresses();

  //   console.log("Listening for OSC over UDP.");
  //   ipAddresses.forEach(function (address) {
  //     console.log(" Host:", address + ", Port:", udpPort.options.localPort);
  //   });

  // }).catch(error => {
  //   if(error.isTtyError) {
  //     // Prompt couldn't be rendered in the current environment
  //     console.log("Prompt couldn't be rendered in the current environment")
  //   } else {
  //     // Something else when wrong
  //     console.log(error)
  //   }
  // })
}