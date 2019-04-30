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
      const result = JSON.parse(this.responseText);

      var hashrate = (result.networkhashps / 1024 / 1024).toFixed(3);
      var difficulty = (result.difficulty).toFixed(3);
      document.getElementById("coinInfoHashrate").innerHTML = hashrate;
      document.getElementById("coinInfoDifficulty").innerHTML = difficulty;
    }
  };

  xhttp.open("GET", "/api/getmininginfo", true);
  xhttp.send();
}

var page = 1;

function updateBlocks()
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

      for(var i = 0; i < result.length; i++)
      {
        document.getElementById("blockIndex" + (i + 1)).innerHTML = result[i].height;
        document.getElementById("blockHash" + (i + 1)).innerHTML = result[i].hash;
        document.getElementById("blockTxCount" + (i + 1)).innerHTML = result[i].tx.length;
      }
    }
  };

  xhttp.open("GET", "/api/getlastblocks?page=" + page, true);
  xhttp.send();
}

function updateBlocksPage(newPage)
{
  page = newPage;
}

function updateSummary()
{
  updateCoinInfo();
  updateBlocks();
}

updateSummary();
setInterval(updateSummary, 10000);
