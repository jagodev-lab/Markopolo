const express = require('express')
const Client = require('@vdinar/vdinar-rpc')

const app = express()
const port = 8000

const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

app.set('view engine', 'pug')

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  res.render('homepage', { title: 'Markopolo explorer' })
})

app.get('/api/getblock', function (req, res) {
  if (typeof req.query.hash != 'undefined') {
    const hash = req.query.hash
    const hashReg = new RegExp('^([a-zA-Z0-9]{64})$')

    if (hashReg.test(hash)) {
      client.getBlock(req.query.hash).then((result) => res.json(result))
      .catch((error) => {
        res.json({ error: true, message: 'Block hash does not correspond to any existing block.' })
      })
    } else {
      res.json({ error: true, message: 'Block hash is not valid.' })
    }
  } else if (typeof req.query.index != 'undefined') {
    const index = parseInt(req.query.index)

    if (index >= 0) {
      client.getBlockchainInfo().then(info => {
        if (info.blocks >= index) {
          client.getBlockHash(index).then(hash => {
            client.getBlock(hash).then(result => {
              res.json(result)
            })
          })
        } else {
          res.json({ error: true, message: 'Block index is higher than the current best height.' })
        }
      })
    } else {
      res.json({ error: true, message: 'Block index is either negative or not an integer.' })
    }
  }
  else
  {
    res.json({ error: true, message: 'No block hash or index provided.' })
  }
})

app.get('/api/getblockbyhash', function (req, res) {
  if (typeof req.query.hash != 'undefined') {
    const hash = req.query.hash
    const hashReg = new RegExp('^([a-zA-Z0-9]{64})$')

    if (hashReg.test(hash)) {
      client.getBlock(req.query.hash).then((result) => res.json(result))
      .catch((error) => {
        res.json({ error: true, message: 'Block hash does not correspond to any existing block.' })
      })
    } else {
      res.json({ error: true, message: 'Block hash is not valid.' })
    }
  } else {
    res.json({ error: true, message: 'No block hash provided.' })
  }
})

app.get('/api/getblockbyindex', function (req, res) {
  if (typeof req.query.index != 'undefined') {
    const index = parseInt(req.query.index)

    if (index >= 0) {
      client.getBlockchainInfo().then(info => {
        if (info.blocks >= index) {
          client.getBlockHash(index).then(hash => {
            client.getBlock(hash).then(result => {
              res.json(result)
            })
          })
        } else {
          res.json({ error: true, message: 'Block index is higher than the current best height.' })
        }
      })
    } else {
      res.json({ error: true, message: 'Block index is either negative or not an integer.' })
    }
  }
  else
  {
    res.json({ error: true, message: 'No block index provided.' })
  }
})

app.get('/api/getblockchaininfo', function (req, res) {
  client.getBlockchainInfo().then((result) => res.json(result))
})

app.get('/api/getblockhash', function (req, res) {
  if (typeof req.query.index != 'undefined') {
    const index = parseInt(req.query.index)

    if (index >= 0) {
      client.getBlockchainInfo().then(info => {
        if (info.blocks >= index) {
          client.getBlockHash(index).then(hash => {
            res.json(hash)
          })
        } else {
          res.json({ error: true, message: 'Block index is higher than the current best height.' })
        }
      })
    } else {
      res.json({ error: true, message: 'Block index is either negative or not an integer.' })
    }
  }
  else
  {
    res.json({ error: true, message: 'No block index provided.' })
  }
})

app.get('/api/getlastblocks', function (req, res) {
  var offset = 0;

  if (typeof req.query.page != 'undefined') {
    const page = Math.max(0, parseInt(req.query.page) - 1)
    offset = page * 10
  }

  var blocks = []

  client.getBlockchainInfo().then((info) => {
    const bestHeight = info.blocks - offset

    for (var i = 0; i < 10; i++) {
      const height = bestHeight - i

      if (height >= 0) {
        client.getBlockHash(height).then((hash) => {
          client.getBlock(hash).then((result) => {
            blocks[bestHeight - result.height] = result

            if (bestHeight - result.height == 9) {
              res.json(blocks)
            }
          })
        })
      } else {
        blocks[i] = { error: true, message: 'Block has a negative index.' }

        if (blocks.length == 10) {
          res.json(blocks)
        }
      }
    }
  })
})

app.get('/api/getmininginfo', function (req, res) {
  client.getMiningInfo().then((result) => res.json(result))
})

app.listen(port, () => console.log(`Markopolo explorer listening on port ${port}!`))
