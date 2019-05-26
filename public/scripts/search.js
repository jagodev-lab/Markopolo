function search()
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
      const result = JSON.parse(this.responseText);

      if(result.hasOwnProperty("error"))
      {
        alert(result.message);
      }
      else
      {
        window.location.href = result.url;
      }
    }
  };

  xhttp.open("GET", "/api/v1.0/search?string=" + document.getElementById("searchText").value, true);
  xhttp.send();
}
