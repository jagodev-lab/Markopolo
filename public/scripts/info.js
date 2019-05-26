function r(f){
  /in/.test(document.readyState) ? setTimeout('r(' + f + ')', 9) : f();
}

function updateCoinInfo()
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

r(function()
  {
    updateCoinInfo();
    setInterval(updateCoinInfo, 10000);
  });
