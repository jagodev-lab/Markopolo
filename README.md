# Markopolo
Blockchain explorer built on vDinar.


## Installation
### Requirements
- vDinar (latest version)
- npm (v6.9.0 or newer)
- Node.js (tested with v10.15.3)
- MongoDB (tested with v4.0.9)

### First step
```
git clone https://github.com/jagodev-lab/Markopolo.git
cd Markopolo
npm install
```

### Second step
- Change MongoDB and vDinar RPC credentials in `app.js` and `scripts/blockchain.js`
- Change Markopolo's absolute path for logging in `scripts/blockchain.js`
- Check writing permissions for `logs` folder
- Set `blocknotify=node Markopolo/scripts/blockchain.js` in `vdinar.conf` (change `Markopolo` to your Markopolo absolute directory)

### Third step
Run Markopolo:
```
node app.js
```
