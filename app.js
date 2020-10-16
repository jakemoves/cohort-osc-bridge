// Copyright Jacob Niedzwiecki, 2019
// Released under the MIT License (see /LICENSE)
// Adapted & expanded from osc.js-examples (https://github.com/colinbdclark/osc.js-examples) by Colin Clark

const osc = require('osc')
const fetch = require('node-fetch')
const inquirer = require('inquirer')
const chalk = require('chalk')

const { v4: uuid } = require('uuid')
const EventEmitter = require('events')
const WebSocket = require('ws')

/****************
 * OSC Over UDP *
 ****************/

var baseServerURL = 'cohort.rocks'
var serverURL, apiToken, socketsURL
var serverEnvironment /* online or offline */
var bridgeMode /* broadcast, receive, or both */
var occasionId
var cohortSession
var inputPort = 57121

var outputPatch = {
  oscAddress: null,
  ipAddress: null,
  port: null
}

var udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: inputPort
});

udpPort.on("ready", async () => {
  console.log(`\n`)

  // ask user to select broadcast, receive, or two-way 
  try {
    let userInput = await inquirer.prompt([{
      type: "list",
      name: "bridgeMode",
      message: "Would you like to broadcast, receive, or both?",
      choices: [{
        name: "Broadcast from OSC to Cohort",
        value: "broadcast",
        short: "broadcast"
      },{
        name: "Receive via OSC from Cohort",
        value: "receive",
        short: "receive"
      },{
        name: "Two-way connection between OSC and Cohort",
        value: "two-way",
        short: "two-way"
      }]
    },{
      type: "list",
      name: "serverEnvironment",
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
    }])

    switch(userInput.bridgeMode){
      case "broadcast": 
        bridgeMode = "broadcast"
        break
      case "receive":
        bridgeMode = "receive"
        break
      case "two-way":
        bridgeMode = "two-way"
        break
    }

    switch(userInput.serverEnvironment){
      case "online":
        serverEnvironment = "online"
        break
      case "offline":
        serverEnvironment = "offline"
    }

    let connected = await verifyCohortServer()

    if(bridgeMode == 'receive' || bridgeMode == 'two-way'){
      let outputPatchDetails = await inquirer.prompt([
      {
        type: "list",
        name: "appOscAddress",
        message: "Where do you want to send Cohort cues to over OSC?",
        choices:[/*{
          name: "QLab",
          value: "qlab",
          short: "qlab"
        },{
          name: "Isadora",
          value: "isadora",
          short: "isadora"
        },*/{
          name: "ETC Eos Console",
          value: "etcEosConsole",
          short: "etcEosConsole"
        }]
      },{
        type: "input",
        name: "outputIP",
        message: "What's the IP address for that destination?",
        validate(input){
          return new Promise( (resolve, reject) => {
            if(input.match(ipAddressRegex)){
              resolve(true)
            } else {
              resolve("Error: invalid IP address")
            }
          })
        }
      },{
        type: "number",
        name: "outputPort",
        message: "What's the port for that destination?",
        validate(input){
          return new Promise( (resolve, reject) => {
            if(!input.isNan){
              resolve(true)
            } else {
              resolve("Error: invalid port number")
            }
          })
        }
      }])
      switch(outputPatchDetails.appOscAddress){
        case 'qlab':
          // qlab doesn't use an app-specific address
          break
        case 'isadora':
          // isadora's OSC address is /isadora, but the address also contains a variable channel number that corresponds to the channel number in the Actor...
          break
        case 'etcEosConsole':
          outputPatch.oscAddress = '/eos'
          outputPatch.ipAddress = outputPatchDetails.outputIP
          outputPatch.port = parseInt(outputPatchDetails.outputPort)
          let test = await verifyLocalEosConsole()
          console.log(test)
          break
      }

      console.log(outputPatch)

      startCohortSession()
    }
    
    if(connected){
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

const verifyLocalEosConsole = function(){
  return new Promise( (resolve, reject) => {
    let testResult = sendOSCMessage("/ping", "check")
    if(testResult == null){resolve()} else { reject(testResult) }
  })
}

udpPort.on("message", function (oscMessage) {
  if(bridgeMode == 'broadcast' || bridgeMode == 'two-way'){
    console.log(`\n`)
    console.log(oscMessage);

    if(oscMessage.address == '/eos/out/ping'){
      console.log('eos console ping successful')
    }

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

    if(oscMessage.args.length == 5){
      payload.cueContent = oscMessage.args[4]
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
  }
})

udpPort.on("error", function (err) {
    console.log(err)
})

udpPort.open()

const sendOSCMessage = function(address, message){
  let result = null
  try {
    udpPort.send({
      address: address,
      args: [{
        type: 's',
        value: message
      }]
    }, outputPatch.ipAddress, outputPatch.port)
  } catch(error){
    console.log(error)
    result = error
  }
  return result
}

const verifyCohortServer = async function(){ // returns true on success, or error
  if(serverEnvironment == "online"){
    serverURL = "https://" + baseServerURL + "/api/v2"
    socketsURL = "wss://" + baseServerURL + "/sockets"

    try {
      const credentials = await promptUsernameAndPassword()
      apiToken = await authenticate(credentials.username, credentials.password) // TODO handle incorrect password / username
      occasionId = await promptOccasionId()
      return true // doesn't catch errors from the above three calls, problem!
    } 
    catch (error){
      console.log(error)
      return error
    }
  } else if(serverEnvironment == "offline"){
    serverEnvironment = "offline"
    baseServerURL = "localhost:3000"
    serverURL = "http://" + baseServerURL + "/api/v2"
    socketsURL = "ws://" + baseServerURL + "/sockets"
    occasionId = 1

    try {
      const headers = getHeaders(apiToken)
      const response = await fetch(serverURL, { // TODO change this to a basic GET /occasions/id when that endpoint exists
        method: 'GET',
        headers: headers
      })
      return true
    }
    catch (error){
      console.log(chalk.redBright("\nCohort Server was not detected running on your system\nMake sure to start the 'cohort-server-offline' app"))
      return error
      // console.log(error)
    }
  }
}

const promptUsernameAndPassword = function(){
  return new Promise( (resolve, reject) => {
    console.log(`\n Enter your username and password`)
    console.log("[register at https://" + baseServerURL + "/admin if you don't have one]\n")
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
const authenticate = (username, password) => {
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
        reject()
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
      if(bridgeMode == 'broadcast' || bridgeMode == 'two-way'){
        console.log("\nStanding by to broadcast cues to occasion " + answers.occasionId)
      }
      if(bridgeMode == 'receive' || bridgeMode == 'two-way'){
        console.log("\nListening for Cohort cues")
      }
      resolve(answers.occasionId)
    }).catch( error => {
      reject(error)
    }) 
  })
}

const startCohortSession = function(){
  cohortSession = new CohortClientSession(socketsURL, occasionId)

  cohortSession.on('connected', () => {
    console.log("connected to cohort server")
  })

  cohortSession.on('disconnected', () => {
    console.log('disconnected from cohort server')
  })

  cohortSession.on('cueReceived', (cue) => {
		console.log('cue received:')
    console.log(cue)
    if(cue.mediaDomain == 4){
      console.log('lx cue')
      if(cue.cueContent === undefined){
        sendOSCMessage(outputPatch.oscAddress + '/cue/fire', cue.cueNumber)
      } else {
        sendOSCMessage(outputPatch.oscAddress + '/cmd', cue.cueContent)
      }
    }
  })

  cohortSession.init().then().catch(error => console.log(error))
}

const finishLaunch = function(){
  const validInterfaces = getNetworkInterfaces();

  console.log(`\nListening for OSC over UDP on IP addresses:`);
  validInterfaces.forEach(function (interface) {
    // console.log("  Host (IP):", address + ", Port:", udpPort.options.localPort);
    console.log("Network: " + interface.deviceName + "; IP address: " + interface.ip + "; port: " + inputPort)
  });

  console.log(`\nTo quit, hit Control+C`)

  
}

const getNetworkInterfaces = function(){
  var os = require("os"),
    interfaces = os.networkInterfaces(),
    validInterfaces = []

  for (var deviceName in interfaces) {
    var addresses = interfaces[deviceName]
    for (var i = 0; i < addresses.length; i++) {
      var addressInfo = addresses[i]
      if (addressInfo.family === "IPv4" && !addressInfo.internal) {
        validInterfaces.push({deviceName: deviceName, ip: addressInfo.address})
      }
    }
  }
  return validInterfaces
}



const getHeaders = (token) => {
  let headers = {
    'Content-Type': 'application/json'
  }

  if(token !== undefined && serverEnvironment == "online"){
    headers['Authorization'] = 'JWT ' + token
  }
  return headers
}

const ipAddressRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|localhost)$/g


class CohortClientSession extends EventEmitter {

  constructor(socketURL, occasionId, tags = [ "all" ], playerLabel = ""){
    super()
    this.socketURL = socketURL
    this.occasionId = occasionId
    this.guid = playerLabel + uuid() 
    this.tags = tags
    this.connected = false
    this.socket
  }

  init(){
    return new Promise( async (resolve, reject) => {
      if(!this.tags.includes("all")){
        console.log("Adding default tag 'all' to Cohort session")
        this.tags.push("all")
      }

      try {
        this.socket = await this.connect()
      }
      catch( error ) {
        return reject(error) 
      }

      return resolve()
    })
  }

  connect(){
    return new Promise( (resolve, reject) => {
      let socket 
      try {
        socket = new WebSocket(this.socketURL)
      } catch (error) {
        console.log(error)
        return reject(error)
      }

      socket.on('open', () => {
        socket.send(JSON.stringify({ 
          guid: "" + this.guid, 
          occasionId: this.occasionId
        }))
      })

      socket.on('close', (msg) => {
        console.log('connection closed with error ' + msg.code + ': ' + msg.reason)
        this.connected = false
        this.emit('disconnected', { code: msg.code, reason: msg.reason })
      })
      
      socket.on('error', (err) => {
        err.stopImmediatePropagation()
        console.log(err)
      })

      socket.on('message', (message) => {
        // console.log(message)
        const msg = JSON.parse(message)
        // console.log(msg)
        
        // finish handshake
        if(this.connected == false && msg.response == "success"){
          this.connected = true
          this.emit('connected')
          return resolve(socket)
        } else if(this.connected == false){
          return reject(msg)
        }

        let cohortCue
        try {
          cohortCue = this.validateCohortCue(msg)
        } catch (error) {
          console.log(error)
          return
        }

        this.emit('cueReceived', cohortCue)
      })
    })
  }

  validateCohortCue(msg) {
    if(msg.mediaDomain == null || msg.mediaDomain === undefined){
      throw new Error("message does not include 'mediaDomain' field")
    }

    if(msg.cueNumber == null || msg.cueNumber === undefined){
      throw new Error("message does not include 'cueNumber' field")
    }

    let tagMatched = false
    msg.targetTags.forEach( tag => {
      if( this.tags.includes(tag)){
        tagMatched = true
        return
      }
    })
    if(!tagMatched){
      throw new Error("Based on tags, this cue is not intended for this client, so we're not triggering it.")
    }

    return msg
  }

  send(object){
    this.socket.send(JSON.stringify(object))
  }
}