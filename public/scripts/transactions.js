function r(f){
  /in/.test(document.readyState) ? setTimeout('r(' + f + ')', 9) : f();
}

var page = 1;

function updateTransactions()
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

      var date = "";
      var id = "";
      var transaction = "";
      for(var i = 0; i < result.length; i++)
      {
        date = new Date(result[i].timestamp * 1000);
        date = date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();

        id = result[i]._id;
        transaction = result[i].transaction;

        document.getElementById("transactionIndex" + (i + 1)).innerHTML = "<a href='/transaction/" + id + "'>" + id + "</a>";
        document.getElementById("transactionHash" + (i + 1)).innerHTML = "<a href='/transaction/" + transaction + "'>" + transaction + "</a>";
        document.getElementById("transactionTime" + (i + 1)).innerHTML = date;
      }
    }
  };

  xhttp.open("GET", "/api/v1.0/getlasttransactions?page=" + page, true);
  xhttp.send();
}

var offset = 0;
function updateTransactionsPage(newPage)
{
  if(newPage == page)
  {
    return;
  }

  // Set previously active page as inactive
  document.getElementById("transactionsPage" + (page - offset)).classList.remove("transactions-page--selected");

  // Update page numbers
  if(newPage - 10 <= 0)
  {
    offset = 0;

    // Update pages from 2 to 20,
    // 1st is static
    for(var i = 2; i <= 20; i++)
    {
      document.getElementById("transactionsPage" + i).innerHTML = i;
      document.getElementById("transactionsPage" + i).setAttribute("onclick", "updateTransactionsPage(" + i + "); return false;");
    }

    // Set new page as active
    document.getElementById("transactionsPage" + newPage).classList.add("transactions-page--selected");
  }
  else
  {
    // Set an offset for pages from 3 to 20
    offset = newPage - 10;

    // Set page 2 as a divider
    document.getElementById("transactionsPage2").innerHTML = "...";
    document.getElementById("transactionsPage2").removeAttribute("onclick");

    // Update pages from 3 to 20,
    // 1st is static and 2nd is a divider
    for(var i = 3; i <= 20; i++)
    {
      document.getElementById("transactionsPage" + i).innerHTML = i + offset;
      document.getElementById("transactionsPage" + i).setAttribute("onclick", "updateTransactionsPage(" + (i + offset) + "); return false;");
    }

    // Set new page as active,
    // always centered as 10th page
    document.getElementById("transactionsPage10").classList.add("transactions-page--selected");
  }

  // Declare the page before calling updateBlocks
  page = newPage;

  // Update the last blocks summary
  updateTransactions();
}

r(function()
  {
    updateTransactions();
    setInterval(updateTransactions, 10000);
  });
