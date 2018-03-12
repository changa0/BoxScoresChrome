// create tab page on chrome bar button click
chrome.browserAction.onClicked.addListener(
  function(activeTab) {
    var newUrl = "page.html";
    chrome.tabs.create({url: newUrl});
  }
);