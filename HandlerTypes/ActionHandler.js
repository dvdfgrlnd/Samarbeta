function ActionHandler() {
    var handlers = [];
    this.addHandler = (handler) => {
        handlers.push(handler);
    }
    this.newMessage = (message) => {
        for (var i = 0; i < handlers.length; i++) {
            if (handlers[i].execute(message))
                break;
        }
    }

    function setStateRecursive(state, index) {
        return new Promise(function (resolve, reject) {
            // Set a handlers state, and wait for it to finish
            handlers[index].setState(state).then((res) => {
                console.log('set state index', index);
                // If this is the last handler, return.
                // Otherwise, set next handlers state, and return when all others are done
                if (index === (handlers.length - 1))
                    resolve();
                else
                    setStateRecursive(state, index + 1).then(resolve);
            });
        });
    }

    this.setState = function (state) {
        return setStateRecursive(state, 0);
    }

    this.getState = function () {
        return new Promise(function (resolve, reject) {
            var state = {};
            var numOfHandlers = handlers.length;
            // Go through all background handlers
            handlers.forEach((d) => {
                // Get state async
                d.getState().then((res) => {
                    // Iterate properties and add to state object
                    Object.keys(res).forEach((f) => {
                        state[f] = res[f];
                    });

                    if (--numOfHandlers === 0) {
                        resolve(state);
                    }
                });
            });
        });
    }
}