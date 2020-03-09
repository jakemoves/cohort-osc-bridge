# Cohort OSC Bridge
QLab can send [OSC messages](https://figure53.com/docs/qlab/v3/control/osc-cues/). This app listens for those messages and sends them to a Cohort server, so they can trigger cues on mobile devices.

## Getting started
- download the [latest version of the app](https://cohort.rocks/binaries/cohort-osc-bridge-latest.zip)
- on your QLab computer, unzip the cohort-osc-bridge app, move to your Applications folder, and run it
- if you get an error or warning message:
  - try right-clicking or (hold command and click) on the app, then clicking 'Open' in the menu that appears, then confirming
  - if that doesn't work, you may need to [adjust your Mac's settings](https://www.imore.com/how-open-apps-anywhere-macos-catalina-and-mojave) to run the app

Or, if you're a developer:
- clone the repository
- ensure your system is using node 8.12.0 or higher ([nvm](https://github.com/nvm-sh/nvm#installation-and-update) is a great way to switch between node versions)
- `npm install`
- `node app.js`

### Start the bridge app
- choose a server mode  
  - **"Online"**: Your QLab computer and your mobile devices must be connected to the internet (over wifi or cellular data) to receive cues. This mode is the easiest to set up, but depends on that internet connection. For Online mode, you'll need to take a couple more steps if it's your first time:
    - Register on the [Cohort Admin website](https://new.cohort.rocks/admin)
    - Create a new event. An event is like a production, or a project.
    - In that event, create a new occasion. An occasion is like a specific performance or rehearsal period.
    - Note the occasion's ID number
  - **"Offline"**: suitable for use in controlled environments like theatres, where your QLab computer and mobile devices are connected to a local network (wifi / WLAN) that may or may not be connected to the internet. You will need to run the [cohort-server-offline app](https://cohort.rocks/binaries/cohort-server-offline-latest.zip) on the same computer where you're running this app. Offline mode offers the most control and lowest latency, but is more complicated to set up.

- if you selected Online:
  - enter your username and password from the Cohort Admin website
  - enter the ID number for the occasion created

- note the Host (IP address) and port listed (i.e., "`Host: 192.168.2.119, Port: 57121`")

### QLab

#### Create a Network Patch
- open or create a Workspace in QLab
- open Workplace Settings (gear icon) > Network
- in the first empty Patch row, enter Host and Port values under 'Destination':

|          | Name          | Type      | Network     | Destination |          | Passcode |
| ---------|---------------|-----------|-------------|-------------|----------|--------- |
| Patch 1: | Cohort Server | _address_ | _automatic_ | [ Host ]    | [ Port ] |          |

- click Done to save your changes and return to the Workspace


#### Compose your Cohort cue message
This takes the format:
`/cohort [media domain] [cue number] [cue action] [grouping]`

- the cue number is set in the Cohort Unity Client app
- the grouping is optional:
  - if not included, cue will be played by all devices
  - if included, cue will only be played by this grouping

| Media Domain | Value |
|--------------|-------|
| sound        | 0     |
| video        | 1     |
| image        | 2     |
| text         | 3     |
| vibration    | 5     |
|                      |

| Cue Action        | Value |
|-------------------|-------|
| play / show / on  | 0     |
| pause             | 1     |
| restart           | 2     |
| stop / hide / off | 3     | 
|                           |

- So to cause sound cue 5 to start playing on all remote devices, your message would be `/cohort 0 5 0`
- To stop that cue: `/cohort 0 5 3`
- To cause devices in grouping 'audience1' to vibrate once: `/cohort 5 0 0 audience1`

#### Create a Network Cue
- create a new Network Cue (it's the bullseye / target / roundel icon)
- open the Settings tab for your new cue
- select the Patch you created
- make sure the Type is set to 'OSC message'
- in the message textbox, enter your Cohort cue message (i.e., '/cohort 0 1 0')
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