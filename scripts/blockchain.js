const Client = require('@vdinar/vdinar-rpc')
const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

const blocksPerUpdate = 500;
const transactionsPerRound = 500;
const requiredConfirmations = 6;

var supply = 0;
var unconfirmedSupply = 0;
var transactions = [];
var transactionsCount = 0;
var unconfirmedTransactionsCount = 0;
// Declaring donations address as first address
var addresses = [{ address: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB", received: 0, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 }];

const delay = ms => new Promise(res => setTimeout(res, ms));

async function initReading() {
  // Reset values to allow multiple reads
  transactions = [];
  addresses = [{ address: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB", received: 0, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 }];
  unconfirmedTransactionsCount = 0;
  unconfirmedSupply = 0;

  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");

    // Check whether collection "info" exists
    dbo.collection("info").findOne(
      { _id: 0},
      async function(err, res) {
        if (err) {
          throw err;
        }

        await dbo.collection("info").updateOne(
          { _id: 0 },
          { $set: {
            updating: true
          } },
          { upsert: true },
          function(err, res) {
            if (err) {
              throw err;
            }
          }
        );

        if (res) {
          if (res.updating) {
            var updating = true;
            while (updating) {
              // Red background color
              console.log("\x1b[41m%s\x1b[0m%s", "WARNING:", " blockchain is being updated by another instance! Trying again in 30 seconds...");
              // Wait 30 seconds
              await delay(30000);
              await dbo.collection("info").findOne(
                { _id: 0 },
                function(err, newRes) {
                  if (err) {
                    throw err;
                  }

                  updating = newRes.updating;
                }
              );
            }
          }

          supply = res.supply;
          transactionsCount = res.transactionsCount;

          const hash = res.lastHash;

          // Set unconfirmed values to 0
          dbo.collection("addresses").updateMany(
            { $or: [{ unconfirmedReceived: { $gt: 0 } }, { unconfirmedSpent: { $gt: 0 } }] },
            { $set: { unconfirmedReceived: 0, unconfirmedSpent: 0 } },
            function(err, res) {
              if (err) {
                throw err;
              }

              // Delete stored unconfirmed transactions
              dbo.collection("transactions").deleteMany(
                { confirmed: false },
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
        } else {
          // Jumping genesis block as its outputs are not spendable
          var hash = await client.getBlockHash(1);

          db.close();

          // Start the reading process
          readBlockchain(hash);
        }
      }
    );
  });
}

async function readBlockchain(hash) {
  var blockchainCompleted = false;
  const blockchainInfo = await client.getBlockchainInfo();
  const lastHeight = Math.min((await client.getBlock(hash)).height + blocksPerUpdate, blockchainInfo.blocks);
  if (lastHeight == blockchainInfo.blocks) {
    blockchainCompleted = true;
  }
  const lastHash = await client.getBlockHash(lastHeight);
  const lastConfirmedHash = await client.getBlockHash(lastHeight - requiredConfirmations);

  // Cyan background color
  console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " blocks round started!");
  // White background color, black font color
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " blocks round's last block's index is " + lastHeight + ".");
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " blocks round's last block's hash is " + lastHash + ".");

  while (hash != lastHash) {
    var newTransactions = [];
    while (newTransactions.length < transactionsPerRound && hash != lastHash) {
      var block = await client.getBlock(hash);

      var confirmed = block.height < lastHeight - requiredConfirmations;
      var baseId = newTransactions.length;
      for (var i = 0; i < block.tx.length; i++) {
        newTransactions.push({
          _id: transactionsCount + unconfirmedTransactionsCount + i,
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
        transactionsCount += block.tx.length;
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
            if (addressId == -1) {
              // Exists in collection but is not stored in array
              addresses.push({ address: address, received: 0, spent: input.value, unconfirmedReceived: 0, unconfirmedSpent: 0 });
            } else {
              addresses[addressId].spent += input.value;
            }
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
        unconfirmedTransactionsCount += block.tx.length;
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
            if (addressId == -1) {
              // Exists in collection but is not stored in array
              addresses.push({ address: address, received: 0, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: input.value });
            } else {
              addresses[addressId].unconfirmedSpent += input.value;
            }
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
    console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " transactions round completed!");
    // White background color, black font color
    console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " after " + (transactionsCount + unconfirmedTransactionsCount) + " transactions supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");
  }

  // Cyan background color
  console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " blocks round loaded!");
  // White background color, black font color
  console.log("\x1b[47m\x1b[30m%s\x1b[0m%s", "INFO:", " after " + (transactionsCount + unconfirmedTransactionsCount) + " transactions supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");

  // Connect to database
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");

    // Update supplies in collection "info"
    dbo.collection("info").updateOne(
      { _id: 0},
      { $set: {
        supply: supply,
        unconfirmedSupply: unconfirmedSupply,
        lastHash: lastConfirmedHash,
        transactionsCount: transactionsCount,
        unconfirmedTransactionsCount: unconfirmedTransactionsCount
      } },
      { upsert: true },
      function(err, res) {
        if (err) {
          throw err;
        }

        // Cyan background color
        console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " info updated succesfully!");

        var addressesBulk = dbo.collection("addresses").initializeUnorderedBulkOp();

        for (var i = 0; i < addresses.length; i++) {
          addressesBulk.find({ address: addresses[i].address }).upsert().updateOne({
            $set: {
              address: addresses[i].address
            },
            $inc: {
              received: addresses[i].received,
              spent: addresses[i].spent,
              unconfirmedReceived: addresses[i].unconfirmedReceived,
              unconfirmedSpent: addresses[i].unconfirmedSpent
            }
          });
        }

        addressesBulk.execute(
          function(err, res) {
            if (err) {
              throw err;
            }

            // Cyan background color
            console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " addresses updated succesfully!");

            // Insert transactions in collection "transactions"
            dbo.collection("transactions").insertMany(
              transactions,
              function(err, res) {
                if (err) {
                  throw err;
                }

                // Cyan background color
                console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " transactions updated succesfully!");

                // Update supplies in collection "info"
                dbo.collection("info").updateOne(
                  { _id: 0},
                  { $set: {
                    updating: false
                  } },
                  { upsert: true },
                  function(err, res) {
                    if (err) {
                      throw err;
                    }

                    // Cyan background color
                    console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " status updated succesfully!");

                    db.close();

                    if (blockchainCompleted) {
                      // Green background color
                      console.log("\x1b[42m%s\x1b[0m%s", "SUCCESS:", " blockchain reading completed!");
                    } else {
                      initReading();
                      // Cyan background color
                      console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " blocks round completed!");
                    }
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
