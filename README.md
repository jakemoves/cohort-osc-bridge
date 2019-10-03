# Cohort OSC Bridge
QLab can send [OSC messages](https://figure53.com/docs/qlab/v3/control/osc-cues/). This small node.js app listens for those messages and sends them to a Cohort server, so they can trigger cues or actions on smart devices.

## Getting started
- clone the repository
- ensure your system is using node 8.12.0 or higher ([nvm](https://github.com/nvm-sh/nvm#installation-and-update) is a great way to switch between node versions)
- `npm install`

### Adjust URL manually
Right now, the Cohort server URL and Cohort event are hardcoded inside index.js. This is lousy and will get fixed first. For now, edit the url variable on line 57 of index.js to reflect your server URL and event ID.

### Start the bridge app
- `node index.js`
- note the IP address (Host) and port listed (i.e., "`Host: 192.168.2.119, Port: 57121`")

### Compose your Cohort cue message
- this takes the format `/cohort X Y Z`, where:
  - X is the media domain: audio is 0, video is 1, text is 2
  - Y is the cue number (on the client)
  - Z is the cue action: play is 0, pause is 1, restart is 2, stop is 3
- so to cause sound cue 5 to start playing on remote devices, your message would be `/cohort 0 5 0`

### QLab
- open or create a Workspace in QLab
- open Wokplace Settings (gear icon) > Network
- in the first empty Patch row, enter Host and Port values under 'Destination':

|          | Name          | Type    | Network   | Destination |          | Passcode |
| ---------|---------------|---------|-----------|-------------|----------|--------- |
| Patch 1: | Cohort Server | address | automatic | [ Host ]    | [ Port ] |          |

- click Done to save your changes and return to the Workspace
- create a new Network Cue (it's the bullseye / target / roundel icon)
- open the Settings tab for your new cue
- select the Patch you created
- make sure the Type is set to 'OSC message'
- in the message textbox, enter your Cohort cue message (i.e., '/cohort 0 5 0')
- try firing the cue in QLab
  - your cohort-osc-bridge terminal window should show the interpretation of your cue message, and a results message from the Cohort server:
  ```
  { address: '/cohort', args: [ 0, 1, 0 ] }
  { mediaDomain: 0,
    cueNumber: 1,
    cueAction: 0,
    targetTags: [ 'all' ] }
  200
  Broadcast to 6 connected clients
  ```

  ## Caveats
  - Cohort does not provide any information back to QLab, so you can't monitor Cohort cues within QLab (i.e., you won't see them in the Active Cues list). You may want to keep one device next to your QLab machine, so you can monitor cues on remote devices after triggering them.