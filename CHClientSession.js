import {v4 as uuid} from 'uuid'
import EventEmitter from 'events'
const WebSocket = require('ws')

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

export default CohortClientSession