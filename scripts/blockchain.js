const Client = require('@vdinar/vdinar-rpc')
const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

const transactionsPerRound = 500;

async function readBlockchain() {
  // Jumping genesis block as its outputs are not spendable
  var hash = await client.getBlockHash(1);
  const blockchainInfo = await client.getBlockchainInfo();
  const lastHeight = blockchainInfo.blocks - 1;
  const lastHash = await client.getBlockHash(lastHeight);
  var supply = 0;
  var unconfirmedSupply = 0;
  var transactions = [];
  // Declaring donations address as first address
  var addresses = [{ address: "DG1KpSsSXd3uitgwHaA1i6T1Bj1hWEwAxB", received: 0, spent: 0, unconfirmedReceived: 0, unconfirmedSpent: 0 }];

  console.log("Hash: " + hash);
  console.log("Blockchain height: " + lastHeight);
  console.log("Last hash: " + lastHash);

  while (hash != lastHash) {
    var newTransactions = [];
    while (newTransactions.length < transactionsPerRound && hash != lastHash) {
      var block = await client.getBlock(hash);

      for (var i = 0; i < block.tx.length; i++) {
        newTransactions.push(block.tx[i]);
      }

      var confirmed = block.height <= lastHeight - 6;

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
        // Update supply
        supply += output.value;

        // Coinbase transaction 1
        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        addresses[0].received += output.value;
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
            // Update local supply
            localSupply -= input.value;
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
        // Update unconfirmed supply
        unconfirmedSupply += output.value;

        // Coinbase transaction 1
        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        // Update address
        addresses[0].unconfirmedReceived += output.value;
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
            // Update local supply
            localSupply -= input.value;
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
    console.log("Round completed! After " + transactions.length + " transactions supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");
  }

  console.log("Blockchain loaded! After " + transactions.length + " transactions confirmed supply is " + supply + " VDN and unconfirmed supply is " + unconfirmedSupply + " VDN.");

  // Connect to database
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
      throw err;
    }
    var dbo = db.db("markopolo");

    // Update supplies in collection "info"
    dbo.collection("info").updateOne(
      { _id: 0},
      { $set: { supply: supply, unconfirmedSupply: unconfirmedSupply } },
      { upsert: true },
      function(err, res) {
        if (err) {
          throw err;
        }

        // TODO: update transactions and addresses

        console.log("Data succesfully inserted in database!");

        db.close();
      }
    );
  });
}

readBlockchain();
