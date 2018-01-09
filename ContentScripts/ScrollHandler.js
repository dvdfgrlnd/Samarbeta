var browser = chrome;

function CreateScrollMessage(scrollPosition) {
    this.type = 'scroll';
    this.action = 'change';
    this.scroll = scrollPosition;
}

window.addEventListener("scroll", onScroll);

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function sendScrollMessage(scrollPosition) {
    var message = {};
    message.type = 'pass';
    message.data = new CreateScrollMessage(scrollPosition);
    console.log(message);
    chrome.runtime.sendMessage(message);
}

var lastScroll = new Point(0, 0);
var MAX_SCROLL_DELTA = 10;
var to = null;
function onScroll() {
    if (to)
        clearTimeout(to);

    to = setTimeout(function () {
        var newScroll = new Point(window.scrollX, window.scrollY);
        to = null;
        if (Math.abs(newScroll.x - lastScroll.x) > MAX_SCROLL_DELTA || Math.abs(newScroll.y - lastScroll.y) > MAX_SCROLL_DELTA) {
            sendScrollMessage(newScroll);
        }
    }, 500);
}

console.log('inside scrollhandler');
browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log('onMessage content script', request);
        if (request.type !== 'scroll' || !request.scroll)
            return;

        switch (request.action) {
            case 'change':
                lastScroll = request.scroll;
                console.log('scrollTo', request.scroll);
                window.scrollTo(request.scroll.x, request.scroll.y);
                break;
        }
    });