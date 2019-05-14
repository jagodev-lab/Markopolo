const Client = require('@vdinar/vdinar-rpc')
const client = new Client({ username: 'testuser', password: 'testpassword', port: '9433' })

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017/";

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

      // Delete current "addresses" collection
      dbo.collection("addresses").drop(
        function(err, res) {
          if (err) {
            throw err;
          }

          // Delete current "transactions" collection
          dbo.collection("transactions").drop(
            function(err, res) {
              if (err) {
                throw err;
              }

              db.close();
            }
          );
        }
      );
    }
  );
});
