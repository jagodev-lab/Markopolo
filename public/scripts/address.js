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

var address;

function getAddressTransactions()
{
  var xhttp;

  if(window.XMLHttpRequest)
  {
    xhttp2 = new XMLHttpRequest();
  }
  else
  {
    xhttp2 = new ActiveXObject("Microsoft.XMLHTTP");
  }

  xhttp2.onreadystatechange = function()
  {
    if(this.readyState == 4 && this.status == 200)
    {
      const result = JSON.parse(this.responseText);

      var date;
      var value;

      for(var i = 0; i < result.length; i++)
      {
        value = 0;

        date = new Date(result[i].timestamp * 1000);
        date = date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();

        for(var j = 0; j < result[i].inputs.length; j++)
        {
          if(result[i].inputs[j].sender == address)
          {
            value -= result[i].inputs[j].value;
          }
        }

        for(var j = 0; j < result[i].outputs.length; j++)
        {
          if(result[i].outputs[j].recipient == address)
          {
            value += result[i].outputs[j].value;
          }
        }

        document.getElementById("addressTransactions").innerHTML += "\
          <div class=\"address-tr address-tr--values\">\
            <div class=\"address-td\">\
              " + date + "\
            </div>\
            <div class=\"address-td\">\
              <a href=\"/transaction/" + result[i].transaction + "\">" + result[i].transaction + "</a>\
            </div>\
            <div class=\"address-td " + ((value > 0) ? "received" : "spent") + "\">\
              <span class=\"value\">" + ((value > 0) ? "+" : "") + value + "</span>\
              <span class=\"currency\"> VDN</span>\
            </div>\
          </div>\
        ";
      }
    }
  };

  xhttp2.open("GET", "/api/v1.0/getaddresstransactions?address=" + address, true);
  xhttp2.send();
}

function getAddress()
{
  var xhttp;

  if(window.XMLHttpRequest)
  {
    xhttp = new XMLHttpRequest();
  }
  else
  {
    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }

  address = document.getElementById("address").innerHTML;

  xhttp.onreadystatechange = function()
  {
    if(this.readyState == 4 && this.status == 200)
    {
      const result = JSON.parse(this.responseText);

      const received = result.received + result.unconfirmedReceived;
      const spent = result.spent + result.unconfirmedSpent;
      const credit = received - spent;

      document.getElementById("addressCredit").innerHTML = credit;
      document.getElementById("addressReceived").innerHTML = received;
      document.getElementById("addressSpent").innerHTML = spent;

      getAddressTransactions();
    }
  };

  xhttp.open("GET", "/api/v1.0/getaddress?address=" + address, true);
  xhttp.send();
}

r(function()
  {
    getAddress();
    updateCoinInfo();
    setInterval(updateCoinInfo, 10000);
  });