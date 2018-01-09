// Global websocket instance
var socket;
var read_only = true;
var session;
var actionHandler = new ActionHandler();
var contentHandler = null;

function sendScrollMessage(message) {
    message = { 'type': 'message', 'data': message };
    console.log(!!socket, message);
    if (socket && !read_only)
        socket.send(messageProtocol.encode(message));
}

function disconnect() {
    if (socket) {
        socket.close();
        socket = null;
    }
    actionHandler = new ActionHandler();
    contentHandler = null;
    session = null;
}

function addHandlers(window_id) {
    // Background handlers
    actionHandler.addHandler(new TabHandler(sendScrollMessage, window_id, chrome));
    actionHandler.addHandler(new URLHandler(sendScrollMessage, window_id, chrome));
    // Content Script handlers
    contentHandler = new ContentHandler(window_id, chrome);
    contentHandler.addHandler('ScrollHandler.js');
    contentHandler.addHandler('SelectionHandler.js');
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {
            case 'connect':
                session = request;
                console.log(sendResponse);
                connect(request.creator, request.username, request.sessionKey, sendResponse, request.window_id);
                return true;
            case 'disconnect':
                disconnect();
                break;
            case 'pass':
                sendScrollMessage(request.data);
                break;
            default:
                break;
        }
    });

function onStateChange(message) {
    console.log(message);
    // Send the message to both the action handler and content handler and let them figure out if the message is relevant.
    actionHandler.newMessage(message.data);
    contentHandler.newMessage(message.data);
}

function getState() {
    return actionHandler.getState();
}

function setState(state) {
    return actionHandler.setState(state);
}

var messageProtocol = JSONMessageProtocol;
var user = '';
function connect(creator, username, sessionKey, onOpen, window_id) {
    if (creator) {
        read_only = false;
    }
    addHandlers(window_id);

    console.log(typeof onOpen);
    // socket = new WebSocket("ws://localhost:9393/");
    socket = new WebSocket("ws://192.168.1.208:9393/");
    socket.onmessage = function (event) {
        console.log('onMessage', event);
        var message = messageProtocol.decode(event.data);
        if (message.sessionKey) {
            // Don't send a response to the popup since it's closed when the new window is launched. The port for the messaging will already be closed.
            //onOpen({ 'sessionKey': message.sessionKey });
        } else if (message.joining) {
            var state = getState().then((state) => {
                var stateMessage = { 'type': 'state', 'username': message.joining, 'data': state };
                socket.send(messageProtocol.encode(stateMessage));
            });
        }
        else if (message.type === 'state') {
            console.log('state', message.data);
            setState(message.data).then(() => {
                console.log('state set');
                read_only = false;
            });
        } else {
            onStateChange(message);
        }
    };
    socket.onopen = function (event) {
        console.log('onOpen');
        var joinMessage = new JoinMessage(username, sessionKey);
        socket.send(messageProtocol.encode(joinMessage));
    };

    socket.onclose = function () {
        console.log('onClose');
        socket = null;
    }
}
