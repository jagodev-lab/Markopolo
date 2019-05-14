const Client = require('@vdinar/vdinar-rpc')
const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

// Cyan background color
console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " database cleaning started!");

MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
  if (err) {
    throw err;
  }
  var dbo = db.db("markopolo");

  // Delete current "info" collection
  dbo.collection("info").drop(
    function(err, res) {
      if (err) {
        throw err;
      }

      // Cyan background color
      console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " \"info\" collection dropped!");

      // Delete current "addresses" collection
      dbo.collection("addresses").drop(
        function(err, res) {
          if (err) {
            throw err;
          }

          // Cyan background color
          console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " \"addresses\" collection dropped!");

          // Delete current "transactions" collection
          dbo.collection("transactions").drop(
            function(err, res) {
              if (err) {
                throw err;
              }

              // Cyan background color
              console.log("\x1b[44m%s\x1b[0m%s", "EVENT:", " \"transactions\" collection dropped!");
              // Green background color
              console.log("\x1b[42m%s\x1b[0m%s", "SUCCESS:", " blockchain cleaning completed!");

              db.close();
            }
          );
        }
      );
    }
  );
});
