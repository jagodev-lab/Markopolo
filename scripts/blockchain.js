const Client = require('@vdinar/vdinar-rpc')
const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

const transactionsPerRound = 500;

var supply = 0;
var unconfirmedSupply = 0;
var transactions = [];
// Declaring donations address as first address
var addresses = [{ address: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB", received: 0, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 }];

async function initReading() {
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");

    // Set unconfirmed values to 0
    dbo.collection("addresses").updateMany(
      { $or: [{ unconfirmedReceived: { $gt: 0 } }, { unconfirmedSpent: { $gt: 0 } }] },
      { $set: { unconfirmedReceived: 0, unconfirmedSpent: 0 } },
      function(err, res) {
        if (err) {
          throw err;
        }

        // Check whether collection "info" exists
        dbo.collection("info").findOne(
          { _id: 0},
          async function(err, res) {
            if (err) {
              throw err;
            }

            if (res) {
              supply = res.supply;

              const block = await client.getBlock(res.lastHash);
              var hash = block.nextblockhash;

              // Load confirmed transactions
              dbo.collection("transactions").find().toArray(
                function(err, res) {
                  if (err) {
                    throw err;
                  }

                  transactions = res.filter(function(transaction) {
                      return transaction.confirmed;
                    });

                  // Load addresses
                  dbo.collection("addresses").find().toArray(
                    function(err, res) {
                      if (err) {
                        throw err;
                      }

                      addresses = res;

                      // Delete current "transactions" collection
                      dbo.collection("transactions").drop(
                        function(err, res) {
                          if (err) {
                            throw err;
                          }

                          // Delete current "addresses" collection
                          dbo.collection("addresses").drop(
                            function(err, res) {
                              if (err) {
                                throw err;
                              }

                              db.close();

                              // Start the reading process
                              readBlockchain(hash);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            } else {
              // Jumping genesis block as its outputs are not spendable
              var hash = await client.getBlockHash(1);

              readBlockchain(hash);
            }
          }
        );
      }
    );
  });
}

async function readBlockchain(hash) {
  const blockchainInfo = await client.getBlockchainInfo();
  const lastHeight = blockchainInfo.blocks - 1;
  const lastHash = await client.getBlockHash(lastHeight);
  if (hash == null) {
    hash = res.lastHash;
  }
  // 6 blocks required to confirm
  const lastConfirmedHash = await client.getBlockHash(lastHeight - 7);

  // Cyan background color
  console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " blockchain reading started!");
  // White background color, black font color
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " last block's index is " + lastHeight + ".");
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " last block's hash is " + lastHash + ".");

  while (hash != lastHash) {
    var newTransactions = [];
    while (newTransactions.length < transactionsPerRound && hash != lastHash) {
      var block = await client.getBlock(hash);

      var confirmed = block.height <= lastHeight - 6;
      var baseId = newTransactions.length;
      var totalBaseId = transactions.length + baseId;
      for (var i = 0; i < block.tx.length; i++) {
        newTransactions.push({
          _id: totalBaseId + i,
          transaction: block.tx[i],
          block: hash,
          confirmed: confirmed,
          inputs: [],
          outputs: [],
          timestamp: block.time,
          value: 0
        });
      }

      var encodedTransaction;
      var transaction;
      var address;
      var addressId;
      var localSupply;
      var encodedInputRoot;
      var inputRoot;
      var input;
      var output;
      // Dividing similar processes to
      // increase speed and avoid
      // several if statements
      if (confirmed) {
        // Coinbase transaction 0
        encodedTransaction = await client.getRawTransaction(block.tx[0]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        address = output.scriptPubKey.addresses[0];
        addressId = addresses.findIndex(x => x.address === address);
        if (addressId == -1) {
          addresses.push({ address: address, received: output.value, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 });
        } else {
          addresses[addressId].received += output.value;
        }
        // Update transactions
        newTransactions[baseId].inputs.push({
            coinbase: true,
            sender: null,
            value: output.value
          });
        newTransactions[baseId].outputs.push({
            recipient: address,
            value: output.value
          });
        newTransactions[baseId].value = output.value;
        // Update supply
        supply += output.value;

        // Coinbase transaction 1
        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        addresses[0].received += output.value;
        // Update transactions
        newTransactions[baseId + 1].inputs.push({
            coinbase: true,
            sender: null,
            value: output.value
          });
        newTransactions[baseId + 1].outputs.push({
            recipient: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB",
            value: output.value
          });
        newTransactions[baseId + 1].value = output.value;
        // Update supply
        supply += output.value;

        // Normal transactions
        for (var i = 2; i < block.tx.length; i++) {
          encodedTransaction = await client.getRawTransaction(block.tx[i]);
          transaction = await client.decodeRawTransaction(encodedTransaction);

          // Reset local supply
          localSupply = 0;

          // Consider spent inputs as negative supply,
          // they will be compensated by outputs
          // This is the most precise way due to fees
          for (var j = 0; j < transaction.vin.length; j++) {
            encodedInputRoot = await client.getRawTransaction(transaction.vin[j].txid);
            inputRoot = await client.decodeRawTransaction(encodedInputRoot);
            input = inputRoot.vout[transaction.vin[j].vout];
            // Update address
            address = input.scriptPubKey.addresses[0];
            addressId = addresses.findIndex(x => x.address === address);
            addresses[addressId].spent += input.value;
            // Update transactions
            newTransactions[baseId + i].inputs.push({
              coinbase: false,
              sender: address,
              value: input.value
            });
            // Update local supply
            localSupply -= input.value;
          }

          // Update transaction's total value
          for (var j = 0; j < newTransactions[baseId + i].inputs.length; j++) {
            newTransactions[baseId + i].value += newTransactions[baseId + i].inputs[j].value;
          }

          // Consider outputs as positive supply
          // to compensate inputs
          for (var j = 0; j < transaction.vout.length; j++) {
            output = transaction.vout[j];
            // Update address
            address = output.scriptPubKey.addresses[0];
            addressId = addresses.findIndex(x => x.address === address);
            if (addressId == -1) {
              addresses.push({ address: address, received: output.value, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 });
            } else {
              addresses[addressId].received += output.value;
            }
            // Update transactions
            newTransactions[baseId + i].outputs.push({
              recipient: address,
              value: output.value
            });
            // Update local supply
            localSupply += output.value;
          }

          // Update supply
          supply += localSupply;
        }
      } else {
        // Coinbase transaction 0
        encodedTransaction = await client.getRawTransaction(block.tx[0]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        address = output.scriptPubKey.addresses[0];
        addressId = addresses.findIndex(x => x.address === address);
        if (addressId == -1) {
          addresses.push({ address: address, received: 0, spent: 0, unconfirmedReceived: output.value, unconfirmedSpent: 0 });
        } else {
          addresses[addressId].received += output.value;
        }
        // Update transactions
        newTransactions[baseId].inputs.push({
            coinbase: true,
            sender: null,
            value: output.value
          });
        newTransactions[baseId].outputs.push({
            recipient: address,
            value: output.value
          });
        newTransactions[baseId].value = output.value;
        // Update unconfirmed supply
        unconfirmedSupply += output.value;

        // Coinbase transaction 1
        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        addresses[0].unconfirmedReceived += output.value;
        // Update transactions
        newTransactions[baseId + 1].inputs.push({
            coinbase: true,
            sender: null,
            value: output.value
          });
        newTransactions[baseId + 1].outputs.push({
            recipient: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB",
            value: output.value
          });
        newTransactions[baseId + 1].value = output.value;
        // Update unconfirmed supply
        unconfirmedSupply += output.value;

        // Normal transactions
        for (var i = 2; i < block.tx.length; i++) {
          encodedTransaction = await client.getRawTransaction(block.tx[i]);
          transaction = await client.decodeRawTransaction(encodedTransaction);

          // Reset local supply
          localSupply = 0;

          // Consider spent inputs as negative supply,
          // they will be compensated by outputs
          // This is the most precise way due to fees
          for (var j = 0; j < transaction.vin.length; j++) {
            encodedInputRoot = await client.getRawTransaction(transaction.vin[j].txid);
            inputRoot = await client.decodeRawTransaction(encodedInputRoot);
            input = inputRoot.vout[transaction.vin[j].vout];
            // Update address
            address = input.scriptPubKey.addresses[0];
            addressId = addresses.findIndex(x => x.address === address);
            addresses[addressId].unconfirmedSpent += input.value;
            // Update transactions
            newTransactions[baseId + i].inputs.push({
              coinbase: false,
              sender: address,
              value: input.value
            });
            // Update local supply
            localSupply -= input.value;
          }

          // Update transaction's total value
          for (var j = 0; j < newTransactions[i].inputs.length; j++) {
            newTransactions[baseId + i].value += newTransactions[baseId + i].inputs[j].value;
          }

          // Consider outputs as positive supply
          // to compensate inputs
          for (var j = 0; j < transaction.vout.length; j++) {
            output = transaction.vout[j];
            // Update address
            address = output.scriptPubKey.addresses[0];
            addressId = addresses.findIndex(x => x.address === address);
            if (addressId == -1) {
              addresses.push({ address: address, received: 0, spent: 0, unconfirmedReceived: output.value, unconfirmedSpent: 0 });
            } else {
              addresses[addressId].unconfirmedReceived += output.value;
            }
            // Update transactions
            newTransactions[baseId + i].outputs.push({
              recipient: address,
              value: output.value
            });
            // Update local supply
            localSupply += output.value;
          }

          // Update unconfirmed supply
          unconfirmedSupply += localSupply;
        }
      }

      hash = block.nextblockhash;
    }

    transactions = transactions.concat(newTransactions);

    // Cyan background color
    console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " round completed!");
    // White background color, black font color
    console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " after " + transactions.length + " transactions supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");
  }

  // Cyan background color
  console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " blockchain loaded!");
  // White background color, black font color
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " after " + transactions.length + " transactions supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");

  // Connect to database
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");

    // Update supplies in collection "info"
    dbo.collection("info").updateOne(
      { _id: 0},
      { $set: { supply: supply, unconfirmedSupply: unconfirmedSupply, lastHash: lastConfirmedHash } },
      { upsert: true },
      function(err, res) {
        if (err) {
          throw err;
        }

        // Cyan background color
        console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " info updated succesfully!");

        // Remove all content from collection "addresses"
        dbo.collection("addresses").deleteMany(
          {},
          function(err, res) {
            if (err) {
              throw err;
            }

            // Insert addresses in collection "addresses"
            dbo.collection("addresses").insertMany(
              addresses,
              function(err, res) {
                if (err) {
                  throw err;
                }

                // Cyan background color
                console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " addresses updated succesfully!");

                // Remove all content from collection "transactions"
                dbo.collection("transactions").deleteMany(
                  {},
                  function(err, res) {
                    if (err) {
                      throw err;
                    }

                    // Insert transactions in collection "transactions"
                    dbo.collection("transactions").insertMany(
                      transactions,
                      function(err, res) {
                        if (err) {
                          throw err;
                        }

                        // Cyan background color
                        console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " transactions updated succesfully!");
                        // Green background color
                        console.log("\x1b[42m%s\x1b[0m%s", "SUCCESS:", " blockchain reading completed!");

                        db.close();
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

initReading();
