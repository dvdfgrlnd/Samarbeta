function CreateTabMessage(index, active) {
    this.type = 'tab';
    this.action = 'create';
    this.index = index;
    this.active = active;
}

function RemoveTabMessage(index) {
    this.type = 'tab';
    this.action = 'remove';
    this.index = index;
}

function HighlightTabMessage(index) {
    this.type = 'tab';
    this.action = 'highlight';
    this.index = index;
}

function TabHandler(sendMessage, wndw_id, browser) {
    var updatedTabs = {};
    var scheduledUpdates = {
        'create': {},
        'highlight': {},
        'remove': {}
    };
    var processUpdate = { callback: null, active: false };

    this.execute = function (message, background) {
        // console.log('handle message', message);
        if (message.type !== 'tab')
            return false;

        // removeListeners();
        processUpdate.active = true;
        parseMessage(message).then(() => {
            // addListeners();
            if (processUpdate.callback) {
                processUpdate.active = false;
                let callback = processUpdate.callback;
                processUpdate.callback = null;

                callback();
            }
        });
//function tmp(sel){ let range={}; Object.keys(sel).forEach(v=> range[v]=v.indexOf('Node')!==-1?sel[v].innerHtml:sel[v]); return range;}
        return true;
    }

    this.getState = function () {
        return new Promise(function (resolve, reject) {
            updateCurrentTabs().then(() => {
                var tabs = [];
                Object.keys(updatedTabs).forEach((d) => {
                    var tab = updatedTabs[d];
                    var current = {};
                    current.index = tab.index;
                    current.active = tab.active;
                    tabs.push(current);
                });
                var state = { 'tabs': tabs };
                resolve(state);
            });
        });
    }

    this.setState = function (state) {
        return new Promise(function (resolve, reject) {
            if (!state.tabs)
                resolve();

            updateCurrentTabs().then(() => {
                var numOfHandlers = state.tabs.length;
                // state.tabs.sort((a, b) => (b.index - a.index));
                let num_open_tabs = Object.keys(updatedTabs).length;
                state.tabs.forEach((d, i) => {
                    // Set the tabs active state
                    if (d.active)
                        scheduledUpdates.highlight[d.index] = d;

                    // Only create the missing tabs. I.e. if the current window has one tab and the current state has two tabs, only create ONE new tab
                    if (i >= num_open_tabs) {
                        // Set the index of the newly created tab
                        scheduledUpdates.create[d.index] = d;

                        // Create new tab and decrease number of tabs left
                        browser.tabs.create({
                            // Hard to set the index of async creation, and the indexes doesn't matter when it's URLHandler that specify the url
                            // 'index': d.index,
                            'active': d.active
                        }, (tab) => {
                            if (--numOfHandlers === 0) {
                                resolve();
                            }
                        });
                    } else {
                        if (--numOfHandlers === 0) {
                            resolve();
                        }
                    }
                });
            });
        });
    }

    function updateCurrentTabs() {
        return new Promise(function (resolve, reject) {
            browser.tabs.query({ 'windowId': wndw_id }, function (tabs) {
                updatedTabs = {};
                tabs.forEach((d) => {
                    updatedTabs[d.id] = d;
                });
                // console.log('updateCurrentTabs', JSON.stringify(updatedTabs));
                resolve();
            });
        });
    }

    function parseMessage(message) {
        return new Promise(function (resolve, reject) {
            console.log('tabhandler parse', message);
            switch (message.action) {
                case 'create':
                    scheduledUpdates.create[message.index] = message;
                    browser.tabs.create({
                        windowId: wndw_id,
                        index: message.index,
                        active: message.active
                    }, function (tab) {
                        console.log('created tab', tab);
                        updateCurrentTabs().then(resolve);
                    });
                    break;
                case 'remove':
                    browser.tabs.query({ windowId: wndw_id, index: message.index }, (tabs) => {
                        console.log('tab removed', tabs);
                        scheduledUpdates.remove[tabs[0].id] = message;
                        browser.tabs.remove(tabs[0].id, function () {
                            updateCurrentTabs().then(resolve);
                        });
                    });
                    break;
                case 'highlight':
                    browser.tabs.query({ windowId: wndw_id, index: message.index }, (tabs) => {
                        scheduledUpdates.highlight[tabs[0].id] = message;
                        browser.tabs.update(tabs[0].id, { active: true }, function () {
                            updateCurrentTabs().then(resolve);
                        });
                    });
                    break;
                default:
                    resolve();
                    break;
            }
        });
    }

    function addListeners() {
        browser.tabs.onCreated.addListener(eventHandler(onCreated));
        browser.tabs.onUpdated.addListener(eventHandler(onUpdated));
        browser.tabs.onActivated.addListener(eventHandler(onActivated));
        browser.tabs.onRemoved.addListener(eventHandler(onRemoved));
    }

    function eventHandler(func) {
        return function () {
            let tab_arguments = arguments;
            // Check if this is the right window
            let complete_update = function () {
                func(...tab_arguments);
            }
            if (processUpdate.active) {
                processUpdate.callback = complete_update;
            } else {
                complete_update();
            }
        };
    }

    function onCreated(tab) {
        if (tab.windowId === wndw_id) {
            // Make sure the tab was created in the correct window
            // Check if this tab was scheduled to be created by a message
            if (scheduledUpdates.create[tab.index]) {
                // If so, delete the item in the create list
                delete scheduledUpdates.create[tab.index];
            } else {
                // Otherwise send a message with tab info
                sendMessage(new CreateTabMessage(tab.index, tab.active));
            }
        }
    }

    function onUpdated(tabId, changeInfo, tab) {
        if (tab.windowId === wndw_id) {
            // Update the list of current tabs
            updatedTabs[tabId] = tab;
        }
    }

    function onActivated(info) {
        if (scheduledUpdates.highlight[info.tabId]) {
            delete scheduledUpdates.highlight[info.tabId];
        } else if (updatedTabs[info.tabId]) {
            // Send active-tab-message if the tab is in the updated-list
            sendMessage(new HighlightTabMessage(updatedTabs[info.tabId].index));
        }
    }

    function onRemoved(tabId) {
        if (scheduledUpdates.remove[tabId]) {
            // The tab was scheduled for removal
            delete scheduledUpdates.remove[tabId];
            delete updatedTabs[tabId];
            return;
        } else if (!updatedTabs[tabId]) {
            // The tab doesn't exist in updatedTabs, it's therefore in another window
            return;
        } else {
            // This session is removing a tab
            var removedTabIndex = updatedTabs[tabId].index;
            delete updatedTabs[tabId];
            // Update tabs and then send a remove-tab-message
            updateCurrentTabs().then(() => {
                sendMessage(new RemoveTabMessage(removedTabIndex));
            });
        }
    }

    addListeners();

}