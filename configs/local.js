
var config = require("./default");

config.containers.master.plugins.forEach(function(plugin) {
    if (plugin.packagePath) {
        if (/\/cloud9.core$/.test(plugin.packagePath)) {
            plugin.socketIoTransports = ["websocket", "htmlfile", "xhr-multipart", "xhr-polling"];
        }
    }
});

module.exports = config;
