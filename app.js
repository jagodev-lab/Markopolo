const express = require('express')
const Client = require('@vdinar/vdinar-rpc')

const app = express()
const port = 8000

const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

app.set('view engine', 'pug')

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  res.render('homepage', { title: 'Markopolo explorer' })
})

app.get('/address/:address', function (req, res) {
  const address = req.params.address
  const addressReg = new RegExp('^([a-zA-Z0-9]{34})$')

  if (!addressReg.test(address)) {
    res.redirect('/')
  } else {
    res.render('address', { title: 'Markopolo explorer', address: address })
  }
})

app.get('/api', function (req, res) {
  res.render('api', { title: 'Markopolo explorer' })
})

app.get('/api/v1.0/getaddress', function (req, res) {
  const address = req.query.address
  const addressReg = new RegExp('^([a-zA-Z0-9]{34})$')

  if (addressReg.test(address)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("addresses").findOne(
        { address: address },
        function(err, result) {
          if (err) {
            throw err
          }

          res.json(result)
          db.close()
        }
      )
    })
  } else {
    res.json({ error: true, message: 'Address is not valid.' })
  }
})

app.get('/api/v1.0/getaddresstransactions', function (req, res) {
  const address = req.query.address
  const addressReg = new RegExp('^([a-zA-Z0-9]{34})$')

  var offset = 0;

  if (typeof req.query.page != 'undefined') {
    const page = Math.max(0, parseInt(req.query.page) - 1)
    offset = page * 10
  }

  if (addressReg.test(address)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("transactions").find(
        {
          $or: [
            {
              inputs: {
                $elemMatch: {
                  sender: address
                }
              }
            },
            {
              outputs: {
                $elemMatch: {
                  recipient: address
                }
              }
            }
          ]
        }
      ).sort(
        {
          timestamp: -1
        }
      ).skip(offset).limit(10).toArray(
        function(err, result) {
          if (err) {
            throw err
          }

          res.json(result)
          db.close()
        }
      )
    })
  } else {
    res.json({ error: true, message: 'Address is not valid.' })
  }
})

app.get('/api/v1.0/getblock', function (req, res) {
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

app.get('/api/v1.0/getblockbyhash', function (req, res) {
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

app.get('/api/v1.0/getblockbyindex', function (req, res) {
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

app.get('/api/v1.0/getblockchaininfo', function (req, res) {
  client.getBlockchainInfo().then((result) => res.json(result))
})

app.get('/api/v1.0/getblockhash', function (req, res) {
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

app.get('/api/v1.0/getlastblocks', function (req, res) {
  var offset = 0;

  if (typeof req.query.page != 'undefined') {
    const page = Math.max(0, parseInt(req.query.page) - 1)
    offset = page * 10
  }

  var blocks = []
  var calculated = 0;

  client.getBlockchainInfo().then((info) => {
    const bestHeight = info.blocks - offset

    for (var i = 0; i < 10; i++) {
      const height = bestHeight - i

      if (height >= 0) {
        client.getBlockHash(height).then((hash) => {
          client.getBlock(hash).then((result) => {
            blocks[bestHeight - result.height] = result
            calculated++

            if (calculated == 10) {
              res.json(blocks)
            }
          })
        })
      } else {
        blocks[i] = { error: true, message: 'Block has a negative index.' }
        calculated++

        if (calculated == 10) {
          res.json(blocks)
        }
      }
    }
  })
})

app.get('/api/v1.0/getlasttransactions', function (req, res) {
  var offset = 0;

  if (typeof req.query.page != 'undefined') {
    const page = Math.max(0, parseInt(req.query.page) - 1)
    offset = page * 10
  }

  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");
    dbo.collection("transactions").find().sort({ _id: -1 }).skip(offset).limit(10).toArray(function(err, result) {
      if (err) {
        throw err;
      }

      res.json(result);
      db.close();
    });
  });
})

app.get('/api/v1.0/getmininginfo', function (req, res) {
  client.getMiningInfo().then((result) => res.json(result))
})

app.get('/api/v1.0/getrawtransaction', function (req, res) {
  if (typeof req.query.id != 'undefined') {
    const id = req.query.id
    const idReg = new RegExp('^([a-zA-Z0-9]{64})$')

    if (hashReg.test(id)) {
      client.getRawTransaction(req.query.id).then((result) => res.json(result))
      .catch((error) => {
        res.json({ error: true, message: 'Transaction id does not correspond to any existing transaction.' })
      })
    } else {
      res.json({ error: true, message: 'Transaction id is not valid.' })
    }
  } else {
    res.json({ error: true, message: 'No transaction id provided.' })
  }
})

app.get('/api/v1.0/getsupply', function (req, res) {
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err
    }
    var dbo = db.db("markopolo")

    dbo.collection("info").findOne(
      { _id: 0 },
      function(err, result) {
        if (err) {
          throw err
        }

        res.json({ confirmed: result.supply, unconfirmed: result.unconfirmedSupply })
        db.close()
      }
    )
  })
})

app.get('/api/v1.0/gettransaction', function (req, res) {
  const id = req.query.id
  const idReg = new RegExp('^([a-zA-Z0-9]{64})$')
  const numericIdReg = new RegExp('^([0-9]+)$')

  if (idReg.test(id)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("transactions").findOne(
        { transaction: id },
        function(err, result) {
          if (err) {
            throw err
          }

          res.json(result)
          db.close()
        }
      )
    })
  } else if (numericIdReg.test(id)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("transactions").findOne(
        { _id: parseInt(id) },
        function(err, result) {
          if (err) {
            throw err
          }

          res.json(result)
          db.close()
        }
      )
    })
  } else {
    res.json({ error: true, message: 'Transaction id neither corresponds to an id nor is numeric.' })
  }
})

app.get('/api/v1.0/search', function (req, res) {
  const string = req.query.string
  const idReg = new RegExp('^([0-9]+)$')
  const hashReg = new RegExp('^([a-zA-Z0-9]{64})$')
  const addressReg = new RegExp('^([a-zA-Z0-9]{34})$')

  if (idReg.test(string)) {
    const index = parseInt(string);

    client.getBlockchainInfo().then(info => {
      if (info.blocks >= index) {
        res.json({ url: '/block/' + index })
      } else {
        res.json({ error: true, message: 'Block index is greater than blockchain height.' })
      }
    })
  } else if (hashReg.test(string)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("transactions").findOne(
        { transaction: string },
        function(err, result) {
          if (err) {
            throw err
          }

          if (result) {
            res.json({ url: '/transaction/' + string })
          } else {
            client.getBlock(string).then(block => {
              res.json({ url: '/block/' + string })
            }).catch(error => {
              res.json({ error: true, message: 'Provided string does not correspond to any block hash or stored transaction.' })
            })
          }
        }
      )
    })
  } else if (addressReg.test(string)) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        throw err
      }
      var dbo = db.db("markopolo")

      dbo.collection("addresses").findOne(
        { address: string },
        function(err, result) {
          if (err) {
            throw err
          }

          if (result) {
            res.json({ url: '/address/' + string })
          }
          else {
            res.json({ error: true, message: 'Provided address does not correspond to any stored address.' })
          }
          db.close()
        }
      )
    })
  } else {
    res.json({ error: true, message: 'String does not correspond to any existing format.' })
  }
})

app.get('/block/:block', function (req, res) {
  const block = req.params.block
  const hashReg = new RegExp('^([a-zA-Z0-9]{64})$')
  const idReg = new RegExp('^([0-9]+)$')

  if (!hashReg.test(block) && !idReg.test(block)) {
    res.redirect('/')
  } else {
    if (!hashReg.test(block)) {
      const index = parseInt(block);

      client.getBlockchainInfo().then(info => {
        if (info.blocks >= index) {
          client.getBlockHash(index).then(hash => {
            res.redirect('/block/' + hash)
          })
        } else {
          res.redirect('/')
        }
      })

    } else {
      res.render('block', { title: 'Markopolo explorer', block: block })
    }
  }
})

app.get('/transaction/:txid', function (req, res) {
  const id = req.params.txid
  const idReg = new RegExp('^([a-zA-Z0-9]{64})$')
  const numericIdReg = new RegExp('^([0-9]+)$')

  if (!idReg.test(id) && !numericIdReg.test(id)) {
    res.redirect('/transactions')
  } else {
    if (!idReg.test(id)) {
      MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
        if (err) {
          throw err
        }
        var dbo = db.db("markopolo")

        dbo.collection("transactions").findOne(
          { _id: parseInt(id) },
          function(err, result) {
            if (err) {
              throw err
            }

            res.redirect('/transaction/' + result.transaction)
            db.close()
          }
        )
      })
    } else {
      res.render('transaction', { title: 'Markopolo explorer', transaction: id })
    }
  }
})

app.get('/transactions', function (req, res) {
  res.render('transactions', { title: 'Markopolo explorer' })
})

app.listen(port, () => console.log(`Markopolo explorer listening on port ${port}!`))
