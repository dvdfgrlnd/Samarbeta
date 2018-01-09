document.getElementById('userForm').onkeydown = checkEnterPress;
// Connecting => not creator of session
document.getElementById('connectButton').onclick = () => connectHandler(false);
document.getElementById('disconnectButton').onclick = disconnect;
document.getElementById('createButton').onclick = createSession;

document.getElementById('username').focus();

chrome.runtime.getBackgroundPage(function (bpage) {
    if (bpage && bpage.session) {
        console.log('active session');
        document.getElementById('username').value = bpage.session.username;
        document.getElementById('sessionKey').value = bpage.session.sessionKey;
        document.getElementById('status').innerText = `Connected to "${bpage.session.sessionKey}"`;

        document.getElementById('connectButton').style.display = 'none';
        document.getElementById('disconnectButton').style.display = 'inline';
    }
});

function disconnect() {
    chrome.runtime.sendMessage({ 'type': 'disconnect' });
    document.getElementById('status').innerText = 'not connected';
    document.getElementById('connectButton').style.display = 'inline';
    document.getElementById('disconnectButton').style.display = 'none';
}

function createSession() {
    var username = document.getElementById('username').value;
    if (username.length < 1) {
        document.getElementById('status').innerText = 'username NOT set';
        return;
    }

    var url = 'http://192.168.1.208:3000/connect';
    fetch(url, { method: 'GET' }).then(response => {
        if (response.status === 200) {
            return response.text();
        }
    }).then(token => {
        console.log(token);
        document.getElementById('sessionKey').value = token;
        // CreateSession => creator of session
        connectHandler(true);
    });
}

function connectHandler(creator) {
    var username = document.getElementById('username').value;
    var sessionKey = document.getElementById('sessionKey').value;
    user = username;
    console.log('connectHandler');
    // Create new empty window for the connection
    chrome.windows.create({}, (win) => {
        console.log(win);
        if (username && sessionKey && sessionKey.length > 1) {
            var connectMessage = {
                'type': 'connect', 'username': username, 'sessionKey': sessionKey, 'window_id': win.id, creator: creator
            };
            console.log(connectMessage);
            chrome.runtime.sendMessage(connectMessage, function onOpen(message) {
                document.getElementById('status').innerText = 'Connected to "' + message.sessionKey + '"';

                document.getElementById('connectButton').style.display = 'none';
                document.getElementById('disconnectButton').style.display = 'inline';
            });

        }
    });
}

function checkEnterPress(e) {
    if (e && e.keyCode == 13) {
        //connectHandler();
    }
}