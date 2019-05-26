function r(f){
  /in/.test(document.readyState) ? setTimeout('r(' + f + ')', 9) : f();
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
        document.getElementById("blockIndex" + (i + 1)).innerHTML = "\
          <a href=\"/block/" + result[i].height + "\">\
            " + result[i].height + "\
          </a>\
        ";
        document.getElementById("blockHash" + (i + 1)).innerHTML = "\
          <a href=\"/block/" + result[i].hash + "\">\
            " + result[i].hash + "\
          </a>\
        ";
        document.getElementById("blockTxCount" + (i + 1)).innerHTML = result[i].tx.length;
      }
    }
  };

  xhttp.open("GET", "/api/v1.0/getlastblocks?page=" + page, true);
  xhttp.send();
}

var offset = 0;
function updateBlocksPage(newPage)
{
  if(newPage == page)
  {
    return;
  }

  // Set previously active page as inactive
  document.getElementById("blocksPage" + (page - offset)).classList.remove("blocks-page--selected");

  // Update page numbers
  if(newPage - 10 <= 0)
  {
    offset = 0;

    // Update pages from 2 to 20,
    // 1st is static
    for(var i = 2; i <= 20; i++)
    {
      document.getElementById("blocksPage" + i).innerHTML = i;
      document.getElementById("blocksPage" + i).setAttribute("onclick", "updateBlocksPage(" + i + "); return false;");
    }

    // Set new page as active
    document.getElementById("blocksPage" + newPage).classList.add("blocks-page--selected");
  }
  else
  {
    // Set an offset for pages from 3 to 20
    offset = newPage - 10;

    // Set page 2 as a divider
    document.getElementById("blocksPage2").innerHTML = "...";
    document.getElementById("blocksPage2").removeAttribute("onclick");

    // Update pages from 3 to 20,
    // 1st is static and 2nd is a divider
    for(var i = 3; i <= 20; i++)
    {
      document.getElementById("blocksPage" + i).innerHTML = i + offset;
      document.getElementById("blocksPage" + i).setAttribute("onclick", "updateBlocksPage(" + (i + offset) + "); return false;");
    }

    // Set new page as active,
    // always centered as 10th page
    document.getElementById("blocksPage10").classList.add("blocks-page--selected");
  }

  // Declare the page before calling updateBlocks
  page = newPage;

  // Update the last blocks summary
  updateBlocks();
}

r(function()
  {
    updateBlocks();
    setInterval(updateBlocks, 10000);
  });
