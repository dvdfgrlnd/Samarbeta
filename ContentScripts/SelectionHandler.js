var browser = chrome;

function CreateSelectionMessage(selection) {
    this.type = 'selection';
    this.action = 'change';
    this.selection = selection;
}

window.addEventListener("mouseup", onMouseUp);

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function sendSelectionMessage(selection) {
    var message = {};
    message.type = 'pass';
    message.data = new CreateSelectionMessage(selection);
    chrome.runtime.sendMessage(message);
}

function findNode(node, text) {
    let children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        let result = findNode(child, text);
        if (result) {
            return result;
        }
    }
    let html = node.innerHTML ? node.innerHTML : node.nodeValue;
    if (html === text) {
        node = text.indexOf('<') === 0 ? node : (node.childNodes.length > 0 ? node.childNodes[0] : node);
        return node;
    }
    return null;
}

function onMouseUp() {
    let sel = window.getSelection();
    if (sel.rangeCount > 0) {
        sel = sel.getRangeAt(0);
        let node_to_string = function (node) {
            return node.parentElement.innerHTML;//node.innerHTML ? node.innerHTML : node.nodeValue;
        }
        // Collapsed is true when no selection is visible (active)
        let selection_obj = {
            collapsed: sel.collapsed,
            commonAncestorContainer: node_to_string(sel.commonAncestorContainer),
            endContainer: node_to_string(sel.endContainer),
            endOffset: sel.endOffset,
            startContainer: node_to_string(sel.startContainer),
            startOffset: sel.startOffset
        };
        sendSelectionMessage(selection_obj);
        // console.log('window.getSelection', sel);
        // console.log(new_obj);
        // console.log('sel properties', Object.getOwnPropertyNames(sel));
        // console.log('parent', JSON.stringify(sel.startContainer.parentElement));
    }
}

browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log('onMessage content script', request);
        if (request.type !== 'selection' || !request.selection)
            return;

        switch (request.action) {
            case 'change':
                let selection = request.selection;
                let window_selection = window.getSelection();
                window_selection.removeAllRanges();
                if (!selection.collapsed) {
                    let range = new Range();
                    range.setStart(findNode(document.body, selection.startContainer), selection.startOffset);
                    range.setEnd(findNode(document.body, selection.endContainer), selection.endOffset);
                    window_selection.addRange(range);
                }
                break;
        }
    });