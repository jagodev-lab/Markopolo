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
  var transactions = [];
  var supply = 0;
  var unconfirmedSupply = 0;

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
      var localSupply;
      var encodedInputRoot;
      var inputRoot;
      var input;
      var output;
      // Dividing similar processes to
      // increase speed and avoid
      // several if statements
      if (confirmed) {

        // Coinbase transactions
        // Update supplies
        encodedTransaction = await client.getRawTransaction(block.tx[0]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        supply += output.value;

        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        supply += output.value;

        // Normal transactions
        for (var i = 2; i < block.tx.length; i++) {
          encodedTransaction = await client.getRawTransaction(block.tx[i]);
          transaction = await client.decodeRawTransaction(encodedTransaction);

          localSupply = 0;

          // Consider spent inputs as negative supply,
          // they will be compensated by outputs
          // This is the most precise way due to fees
          for (var j = 0; j < transaction.vin.length; j++) {
            encodedInputRoot = await client.getRawTransaction(transaction.vin[j].txid);
            inputRoot = await client.decodeRawTransaction(encodedInputRoot);
            input = inputRoot.vout[transaction.vin[j].vout];

            localSupply -= input.value;
          }

          // Consider outputs as positive supply
          // to compensate inputs
          for (var j = 0; j < transaction.vout.length; j++) {
            output = transaction.vout[j];

            localSupply += output.value;
          }

          supply += localSupply;
        }
      }
      else {
        // Coinbase transactions
        // Update supplies
        encodedTransaction = await client.getRawTransaction(block.tx[0]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        unconfirmedSupply += parseFloat(output.value);

        encodedTransaction = await client.getRawTransaction(block.tx[1]);
        transaction = await client.decodeRawTransaction(encodedTransaction);
        output = transaction.vout[0];
        unconfirmedSupply += parseFloat(output.value);

        // Normal transactions
        for (var i = 2; i < block.tx.length; i++) {
          encodedTransaction = await client.getRawTransaction(block.tx[i]);
          transaction = await client.decodeRawTransaction(encodedTransaction);

          localSupply = 0;

          // Consider spent inputs as negative supply,
          // they will be compensated by outputs
          // This is the most precise way due to fees
          for (var j = 0; j < transaction.vin.length; j++) {
            encodedInputRoot = await client.getRawTransaction(transaction.vin[j].txid);
            inputRoot = await client.decodeRawTransaction(encodedInputRoot);
            input = inputRoot.vout[transaction.vin[j].vout];

            localSupply -= input.value;
          }

          // Consider outputs as positive supply
          // to compensate inputs
          for (var j = 0; j < transaction.vout.length; j++) {
            output = transaction.vout[j];

            localSupply += output.value;
          }

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
