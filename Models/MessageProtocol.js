var JSONMessageProtocol = {
    // Converts a JoinMessage to a JSON string representation
    encode: function (message) {
        // Return the JSON representation of the message
        return JSON.stringify(message);
    },
    // Converts a JSON representation to an object
    decode: function (message) {
        // Return the JSON representation of the message
        return JSON.parse(message);
    }
};
