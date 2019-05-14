function r(f){
  /in/.test(document.readyState) ? setTimeout('r(' + f + ')', 9) : f();
}

function updateCoinInfo()
{
  if(window.XMLHttpRequest)
  {
    xhttp = new XMLHttpRequest();
  }
  else
  {
    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }

  xhttp.onreadystatechange = function()
  {
    if(this.readyState == 4 && this.status == 200)
    {
      const miningInfo = JSON.parse(this.responseText);

      const hashrate = (miningInfo.networkhashps / 1024 / 1024).toFixed(3);
      const difficulty = (miningInfo.difficulty).toFixed(3);

      xhttp.onreadystatechange = function()
      {
        if(this.readyState == 4 && this.status == 200)
        {
          const supplyInfo = JSON.parse(this.responseText);

          const supply = (supplyInfo.confirmed + supplyInfo.unconfirmed).toFixed(2);

          document.getElementById("coinInfoHashrate").innerHTML = hashrate;
          document.getElementById("coinInfoDifficulty").innerHTML = difficulty;

          document.getElementById("coinInfoSupply").innerHTML = supply;
        }
      }

      xhttp.open("GET", "/api/v1.0/getsupply", true);
      xhttp.send();
    }
  };

  xhttp.open("GET", "/api/v1.0/getmininginfo", true);
  xhttp.send();
}

function getTransaction()
{
  if(window.XMLHttpRequest)
  {
    xhttp = new XMLHttpRequest();
  }
  else
  {
    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }

  xhttp.onreadystatechange = function()
  {
    if(this.readyState == 4 && this.status == 200)
    {
      const result = JSON.parse(this.responseText);

      const value = result.value;
      const inputs = result.inputs;
      const outputs = result.outputs;

      document.getElementById("transactionValue").innerHTML = value;

      for(var i = 0; i < inputs.length; i++)
      {
        document.getElementById("transactionInputs").innerHTML += "\
            <div class='inputs-tr inputs-tr--values" + (inputs[i].coinbase ? " inputs-tr--coinbase" : "") + "'>\
              <div class='inputs-td'>\
                " + (inputs[i].coinbase ? "Coinbase" : inputs[i].sender) + "\
              </div>\
              <div class='inputs-td'>\
                " + inputs[i].value + "\
              </div>\
            </div>\
          ";
      }

      for(var i = 0; i < outputs.length; i++)
      {
        document.getElementById("transactionOutputs").innerHTML += "\
            <div class='outputs-tr outputs-tr--values'>\
              <div class='outputs-td'>\
                " + outputs[i].recipient + "\
              </div>\
              <div class='outputs-td'>\
                " + outputs[i].value + "\
              </div>\
            </div>\
          ";
      }
    }
  };

  xhttp.open("GET", "/api/v1.0/gettransaction?id=" + document.getElementById("transactionId").innerHTML, true);
  xhttp.send();
}

r(function()
  {
    getTransaction();
    updateCoinInfo();
    setInterval(updateCoinInfo, 10000);
  });