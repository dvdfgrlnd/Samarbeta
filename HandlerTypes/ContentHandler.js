function ContentHandler(wndw_id, browser) {
    var handlers = [];
    this.addHandler = (handler) => {
        handler = "ContentScripts/" + handler;
        handlers.push(handler);
    }
    // On new message from other users
    this.newMessage = (message) => {
        // Get all tabs in window and send the arrived to all handler and let them handle the message individually.
        browser.tabs.query({ 'windowId': wndw_id }, function (tabs) {
            console.log('send to tabs', tabs);
            // Send the message to every tab
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, message, function (response) { });
            });
        });
    }

    var injectScripts = (tabId) => {
        // Iterate through all handlers and insert each content script into the newly created tab
        handlers.forEach((d) => {
            browser.tabs.executeScript(tabId, { file: d }, _ => { });
        });
    }

    // Called on tab change (update)
    function onUpdated(tabId, changeInfo, tab) {
        // Inject all content scripts if it's the correct window and the tab has completed loading (i.e. a new tab was created)
        if (tab.windowId === wndw_id && !tab.url.startsWith('chrome://') && changeInfo.status === 'complete'){
            injectScripts(tab.id);
        }
    }

    browser.tabs.onUpdated.addListener(onUpdated);
}