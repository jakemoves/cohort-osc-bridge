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
var occasionId

var udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121
});

udpPort.on("ready", async () => {
  console.log(`\n`)

  // ask user to select server mode
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
        } ]
      }]
    )

    if(answer1.serverMode == "online"){
      serverMode = "online"
      serverURL = "https://new.cohort.rocks/api/v2"
      try {
        const credentials = await promptUsernameAndPassword()
        apiToken = await authenticate(credentials.username, credentials.password)
        occasionId = await promptOccasionId()
        finishLaunch()
      } 
      catch (error){
        console.log(error)
      }
    } 
    
    if(answer1.serverMode == "offline"){
      serverMode = "offline"
      serverURL = "http://localhost:3000/api/v2"

      try {
        const headers = getHeaders(apiToken)
        const response = await fetch(serverURL + '/occasions/' + input + '/qrcode', { // TODO change this to a basic GET /occasions/id when that endpoint exists
          method: 'GET',
          headers: g
        })
        
        if(response.status == 200){
          resolve(true)
        } else {
          const error = await response.text()
          reject(error)
        }
      }
      catch (error){
        console.log(error)
      }

  
      finishLaunch()
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
})

udpPort.on("message", function (oscMessage) {
  console.log(`\n`)
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
 
  const headers = getHeaders(apiToken)

  console.log("Sending cue: ")
  console.log(payload)
  fetch(serverURL + '/occasions/' + occasionId + '/broadcast', {
    method: 'POST', 
    headers: headers,
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
})

udpPort.on("error", function (err) {
    console.log(err)
})

udpPort.open()


function promptUsernameAndPassword(){
  return new Promise( (resolve, reject) => {
    console.log(`\n Enter your username and password`)
    console.log("[register at https://new.cohort.rocks/admin if you don't have one]\n")
    inquirer.prompt([{
      type: "input",
      name: "username",
      message: "Username:",
      default: "",
      validate(input){
        return new Promise( (resolve, reject) => {
          if(input != ""){
            resolve(true)
          } else {
            resolve("Error: Username cannot be blank")
          }
        })
      }
    },{
      type: "password",
      name: "password",
      message: "Password:",
      default: "",
      validate(input){
        return new Promise( (resolve, reject) => {
          if(input != ""){
            resolve(true)
          } else {
            resolve("Error: Password cannot be blank")
          }
        })
      }
    }]).then(answers => {
      resolve({ username: answers.username, password: answers.password })
    }).catch(error => {
      console.log(error)
      reject(error)
    })
  })
}

// returns an API token or an error
authenticate = (username, password) => {
  return new Promise( (resolve, reject) => {
    // get a token
    const headers = getHeaders(apiToken)
    const payload = { username: username, password: password }

    fetch(serverURL + '/login?sendToken=true', {
      method: 'POST', 
      body: JSON.stringify(payload),
      headers: headers
    }).then( response => {
      if(response.status == 200){
        response.json().then( results => {
          if(results.jwt !== undefined && results.jwt){
            console.log(`\nLogged into Cohort server`)
            resolve(results.jwt)
          }
        })
      } else {
        // heckin error, gotta fail the promise and show the user something
        console.log(response.status)
        reject(error)
      }
    })
  })
}

function promptOccasionId(){
  return new Promise( (resolve, reject) => {
    inquirer.prompt([{
      type: "input",
      name: "occasionId",
      message: `\nEnter an occasion ID to broadcast to: `,
      validate(input){
        return new Promise( async (resolve, reject) => {
          if(input == ""){
            reject("Error: occasion ID cannot be blank")
          }
          
          // make sure this occasion exists and user can access it
          const headers = getHeaders(apiToken)
          const response = await fetch(serverURL + '/occasions/' + input + '/qrcode', { // TODO change this to a basic GET /occasions/id when that endpoint exists
            method: 'GET',
            headers: headers
          })
          
          if(response.status == 200){
            resolve(true)
          } else {
            const error = await response.text()
            reject(error)
          }
        })
      }
    }]).then( answers => {
      console.log("\nStanding by to broadcast cues to occasion " + answers.occasionId)
      resolve(answers.occasionId)
    }).catch( error => {
      reject(error)
    }) 
  })
}

function finishLaunch (){
  const ipAddresses = getIPAddresses();

  console.log(`\nListening for OSC over UDP on IP addresses:`);
  ipAddresses.forEach(function (address) {
    console.log("  Host (IP):", address + ", Port:", udpPort.options.localPort);
  });

  console.log(`\nTo quit, hit Control+C`)

  function getIPAddresses(){
    var os = require("os"),
      interfaces = os.networkInterfaces(),
      ipAddresses = []

    for (var deviceName in interfaces) {
      var addresses = interfaces[deviceName]
      for (var i = 0; i < addresses.length; i++) {
        var addressInfo = addresses[i]
        if (addressInfo.family === "IPv4" && !addressInfo.internal) {
          ipAddresses.push(addressInfo.address)
        }
      }
    }
    return ipAddresses
  }
}

getHeaders = (token) => {
  let headers = {
    'Content-Type': 'application/json'
  }

  if(token !== undefined && serverMode == "online"){
    headers['Authorization'] = 'JWT ' + token
  }
  return headers
}