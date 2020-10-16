# Cohort OSC Bridge
[Cohort](https://cohort.rocks) is a toolkit that makes it easier to integrate phones and tablets in creative projects. Cohort OSC Bridge provides an integration with common show control applications like QLab and Isadora. Cohort cues can be sent from these apps. You can also directly control ETC Eos lighting consoles with Cohort cues.

### Details
[QLab](https://qlab.app/docs/v4/scripting/osc-dictionary-v4/) and [Isadora](https://support.troikatronix.com/support/solutions/articles/13000075034-guru-session-9-real-time-interaction-with-open-sound-control-osc-) can send OSC messages. This app listens for those messages and passes them along to a Cohort server, so they can trigger cues on mobile devices. 

[ETC Eos lighting consoles](https://www.etcconnect.com/workarea/DownloadAsset.aspx?id=10737461372)) can receive OSC messages. This app listens for cues from a Cohort server and passes them to the console you're working with.

## Getting started
- download the [latest version of the app](https://cohort.rocks/binaries/cohort-osc-bridge-latest.zip)
- on your QLab computer, unzip the cohort-osc-bridge app, move to your Applications folder, and run it
- if you get an error or warning message:
  - try right-clicking (or hold command and click) on the app, then clicking 'Open' in the menu that appears, then confirming
  - if that doesn't work, you may need to [adjust your Mac's settings](https://www.imore.com/how-open-apps-anywhere-macos-catalina-and-mojave) to run the app

Or, if you're a developer:
- clone the repository
- ensure your system is using node 12.19.0 or higher ([nvm](https://github.com/nvm-sh/nvm#installation-and-update) is a great way to switch between node versions)
- in the cloned folder:
  - `npm install`
  - `node app.js`

### Start the bridge app
1) choose a bridge mode
  - **broadcast**: trigger cues on mobile devices using QLab or Isadora
  - **receive**: listen for cues from Cohort and pass them to a lighting console
  - **two-way**: both of the above
2) choose a server mode  
  - **"Online"**: Your computer and your mobile devices must be connected to the internet (over wifi or cellular data) to receive cues. This mode is the easiest to set up, but depends on that internet connection. Online mode requires you to enter a username and password for the [Cohort Admin website](https://cohort.rocks/admin), as well as asking for an 'occasion id'. For testing purposes, you can use these shared demo credentials:
    - username: demouser
    - password: demodemo
    - occasion id: 9
  When you start working on your own project, you'll want your own account:
    - Register on the [Cohort Admin website](https://cohort.rocks/admin)
    - Create a new event. An event is like a production, or a project.
    - In that event, create a new occasion. An occasion is like a specific performance or rehearsal period.
    - Note the occasion's ID number
  - **"Offline"**: suitable for use in controlled environments like theatres, where your show computer and mobile devices are connected to a local network (wifi / WLAN) that may or may not be connected to the internet. You will need to run the [cohort-server-offline app](https://cohort.rocks/binaries/cohort-server-offline-latest.zip) on the same computer where you're running this app. Offline mode offers the most control, the fastest turnaround when revising cues and content, and the lowest latency, but is more complicated to set up.

#### Broadcast mode
- enter the username, password, and occasion id 
- note the IP address and port listed (i.e., "`Host: 192.168.2.119, Port: 57121`)
- skip ahead to the instructions for QLab or Isadora

#### Receive mode
- enter the IP address for your Eos console (this can be found in the Welcome Screen > Settings)
- enter the port number for your Eos console
  - this must be configured on the console
  - Setup > System Settings > Show Control > OSC 
  - verify that 'OSC Rx' is set to ON
  - note down the port number or set one if it's blank
- skip ahead to the instructions for ETC Eos consoles


## QLab

### Create a Network Patch
- open or create a Workspace in QLab
- open Workplace Settings (gear icon) > Network
- in the first empty Patch row, enter the IP address and Port values displayed in the Bridge window under 'Destination':

|          | Name          | Type      | Network     | Destination |          | Passcode |
| ---------|---------------|-----------|-------------|-------------|----------|--------- |
| Patch 1: | Cohort Server | _address_ | _automatic_ | [ Host ]    | [ Port ] |          |

- click Done to save your changes and return to the Workspace

### Compose your Cohort cue message
This takes the format:
`/cohort [media domain] [cue number] [cue action] [grouping] [cue content]`

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
| light        | 4     |
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

### Create a Network Cue
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

### Caveats
- Cohort does not provide any information back to QLab, so you can't monitor Cohort cues within QLab (i.e., you won't see them in the Active Cues list). You may want to keep one device next to your QLab machine, so you can monitor cues on remote devices after triggering them.

## Isadora

- instructions coming soon

## ETC Eos consoles
Cohort light cues (mediaDomain: 4) will be passed along to consoles when using this app in Receive or Two-way mode.
- if the cueContent field is not present, the lighting console will read the cueNumber field and attempt to fire its matching cue
- if the cueContent field is present, the console will use it as command-line entry. For example, setting the cueContent field in the Cohort cue to 'chan 1 at 50 enter' will cause the console to behave as if that command was entered manually (note that the 'enter' is necessary to include if you want the command executed). Check out the [EOS Family Show Control manual](https://www.etcconnect.com/workarea/DownloadAsset.aspx?id=10737461372) for full details.