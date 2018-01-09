function CreateURLChangeMessage(index, url) {
    this.type = 'url';
    this.action = 'loading';
    this.index = index;
    this.url = url;
}

function URLHandler(sendMessage, wndw_id, browser) {
    var scheduledUpdates = { 'update': {} };
    var processUpdate = { callback: null, active: false };

    this.execute = function (message, background) {
        // console.log('handle message', message);
        if (message.type !== 'url')
            return false;

        // removeListeners();
        processUpdate.active = true;
        parseMessage(message).then(() => {
            // addListeners();
            processUpdate.active = false;
            if (processUpdate.callback) {
                let callback = processUpdate.callback;
                processUpdate.callback = null;

                callback();
            }
        });

        return true;
    }

    this.getState = function () {
        return new Promise(function (resolve, reject) {
            getCurrentTabs().then((tabs) => {
                var urls = [];
                tabs.forEach((d) => {
                    var tab = {};
                    tab.index = d.index;
                    tab.url = d.url;
                    urls.push(tab);
                });
                var state = { 'urls': urls };
                resolve(state);
            });
        });
    }

    this.setState = function (state) {
        return new Promise(function (resolve, reject) {
            if (!state.urls)
                resolve();

            console.log('set url state');
            var numOfHandlers = state.urls.length;
            state.urls.forEach((d) => {
                console.log('url ', d);
                browser.tabs.query({ 'windowId': wndw_id, 'index': d.index }, (tabs) => {
                    scheduledUpdates.update[tabs[0].id] = d;

                    browser.tabs.update(tabs[0].id, { 'url': d.url }, () => {
                        if (--numOfHandlers === 0)
                            resolve();
                    });
                });
            });
        });
    }

    function getCurrentTabs() {
        return new Promise(function (resolve, reject) {
            browser.tabs.query({ 'windowId': wndw_id }, function (tabs) {
                resolve(tabs);
            });
        });
    }

    function parseMessage(message) {
        return new Promise(function (resolve, reject) {
            console.log('urlhandler parse', message);
            switch (message.action) {
                case 'loading':
                    browser.tabs.query({ 'windowId': wndw_id, 'index': message.index }, (tabs) => {
                        scheduledUpdates.update[tabs[0].id] = message;

                        browser.tabs.update(tabs[0].id, { 'url': message.url }, () => {
                            console.log('changed url');
                            resolve();
                        });
                    });
                    break;
                default:
                    resolve();
                    break;
            }
        });
    }

    // function removeListeners() {
    //     // console.log('removeListeners');
    //     browser.tabs.onCreated.removeListener(onCreated);
    //     browser.tabs.onUpdated.removeListener(onUpdated);
    //     browser.tabs.onActivated.removeListener(onActivated);
    // }

    function addListeners() {
        // console.log('addListeners');
        browser.tabs.onCreated.addListener(onCreated);
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.tabs.onActivated.addListener(onActivated);
    }

    function onCreated(tab) {
        // console.log('urlhandler onCreated');
    }

    function onUpdated(tabId, changeInfo, tab) {
        // console.log('urlhandler onUpdated', changeInfo);
        if (tab.windowId === wndw_id && changeInfo.status === 'complete') {
            let complete_update = function () {
                if (scheduledUpdates.update[tab.id]) {
                    delete scheduledUpdates.update[tab.id];
                } else {
                    sendMessage(new CreateURLChangeMessage(tab.index, tab.url));
                }
            }
            if (processUpdate.active) {
                processUpdate.callback = complete_update;
            } else {
                complete_update();
            }
        }
    }

    function onActivated(tab) {
        // console.log('urlhandler onActivated');
        // sendMessage(new CreateTabMessage(tab.id, tab.index, tab.url, tab.active));
    }

    addListeners();

}