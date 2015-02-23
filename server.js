//-- packages
var http = require("http");
var https = require("https");
var fs = require("fs");
var os = require("os");
var cluster = require("cluster");
var sites = require("./config.js");
var settings = require("./serverConfig.js");

var presenter = require("./presenter.js");
var http2 = null;
//-- vars
var numCPUs = os.cpus().length;
var machineName = os.hostname().toUpperCase();
var port = process.env.PORT !== undefined ? process.env.PORT || 4443 : 3000;
var clusterForks = numCPUs >= 2 ? numCPUs - 1 : 1;
//var certificate = fs.readFileSync("./cert/xxx.xxx.com.pfx");
//var credentials = { pfx: certificate, passphrase: "123123" };
//var siteCache = !cluster.isMaster ? require("./loadCache.js").getCache() : null;
var etagCache = [];
var env = "";
var allowHTTP2 = false;

//-- prototype HTTP2
if (allowHTTP2) { http2 = require("http2"); }

//-- messaging
var consoleLog = function (message, force) {
    if (serverSettings.dev || force) { console.log(message); }
};

//-- check for command line parameters
process.argv.forEach(function(val, index, array) {
    if (val.indexOf("=") > 0) {
        var param = val.split("=");
        try {
            if (param[0].toLowerCase() === "env") {
                env = param[1].toLowerCase();
            }
        } catch (e) {}
    }
});
if (env == "") { env = "default"; }
var serverSettings = settings.config[env];
process.argv.forEach(function(val, index, array) {
    if (val.indexOf("=") > 0) {
        var param = val.split("=");
        try {
            if (param[0].toLowerCase() === "port") {
                serverSettings.port = parseInt(param[1],10);
            }
            if (param[0].toLowerCase() === "cluster") {
                serverSettings.cluster = parseInt(param[1],10);
            }
            if (param[0].toLowerCase() === "listeners") {
                serverSettings.listeners = parseInt(param[1],10);
            }
            if (param[0].toLowerCase() === "ssl") {
                serverSettings.ssl = param[1].toLowerCase() == "false" ? false : true;
            }
            if (param[0].toLowerCase() === "nocache") {
                serverSettings.nocache = param[1].toLowerCase() == "false" ? false : true;
            }
            if (param[0].toLowerCase() === "compress") {
                serverSettings.compress = param[1].toLowerCase() == "false" ? false : true;
            }
            if (param[0].toLowerCase() === "dev") {
                serverSettings.dev = param[1].toLowerCase() == "false" ? false : true;
            }
            if (param[0].toLowerCase() === "gzip") {
                serverSettings.gzip = param[1].toLowerCase() == "false" ? false : true;
            }
        } catch (e) {}
    }
});
port = serverSettings.port;
process._maxListeners = serverSettings.listeners;
serverSettings.combind = settings.config.combind;

//-- HTTP(s) Server
var serverRequest = function (req, res) {
    //-- now lets respond to a request
    try {
        presenter.request(req, res, sites, siteCache, serverSettings.compress, etagCache, serverSettings.nocache, serverSettings.dev, serverSettings);
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain'});
        res.end(e.message);
    }
};

//-- start listener
if (cluster.isMaster) {
    consoleLog("");
    consoleLog("\x1b[36mMachine " + os.hostname().toUpperCase()  + " with " + numCPUs + " CPUs. In cluster Mode.\x1b[0m", true);
    consoleLog("\x1b[36mRunning in " + (serverSettings.ssl ? "Secure SSL" : "HTTP Only") + " mode.\x1b[0m", true);
    consoleLog("\n\x1b[42m                             \x1b[0m");
    consoleLog("\x1b[32m API Environment: \x1b[0m" + env);
    consoleLog("\x1b[32m Port...........: \x1b[0m" + serverSettings.port);
    consoleLog("\x1b[32m Debug Port.....: \x1b[0m" + process.debugPort);
    consoleLog("\x1b[32m Cluster........: \x1b[0m" + serverSettings.cluster);
    consoleLog("\x1b[32m Listeners......: \x1b[0m" + serverSettings.listeners);
    consoleLog("\x1b[32m SSL............: \x1b[0m" + serverSettings.ssl);
    consoleLog("\x1b[32m Nocache........: \x1b[0m" + serverSettings.nocache);
    consoleLog("\x1b[32m Compress.......: \x1b[0m" + serverSettings.compress);
    consoleLog("\x1b[32m Gzip...........: \x1b[0m" + serverSettings.gzip);
    consoleLog("\x1b[32m Dev............: \x1b[0m" + serverSettings.dev);
    consoleLog("\x1b[32m cacheBuster....: \x1b[0m" + serverSettings.cacheBuster);
    consoleLog("\x1b[33m Node...........: \x1b[0m" + process.versions.node);
    consoleLog("\x1b[33m Http Parser....: \x1b[0m" + process.versions.http_parser);
    consoleLog("\x1b[33m V8.............: \x1b[0m" + process.versions.v8);
    consoleLog("\x1b[33m UV.............: \x1b[0m" + process.versions.uv);
    consoleLog("\x1b[33m zlib...........: \x1b[0m" + process.versions.zlib);
    consoleLog("\x1b[33m Ares...........: \x1b[0m" + process.versions.ares);
    consoleLog("\x1b[33m Modules........: \x1b[0m" + process.versions.modules);
    consoleLog("\x1b[33m OpenSSL........: \x1b[0m" + process.versions.openssl);
    consoleLog("\x1b[33m Arch...........: \x1b[0m" + process.arch);
    consoleLog("\x1b[33m Platform.......: \x1b[0m" + os.platform());
    consoleLog("\x1b[42m                             \x1b[0m\n");
    //-- create clusters
    for (var i = 1; i <= serverSettings.cluster; i++) { cluster.fork(); }
    cluster.on("exit", function(worker, code, signal) { var exitCode = worker.process.exitCode; console.log("worker " + worker.process.pid + " died (" + exitCode + "). restarting..."); cluster.fork(); });
    cluster.on('listening', function(worker, address) { console.log("Worker " + worker.process.pid + " listening  on " + address.port); });
} else {
    // Workers can share any TCP connection, In this case its a HTTP(s) server
    var server = null;
    if (serverSettings.ssl) {
        if (allowHTTP2) {
            server = http2.createServer(credentials, function (req, res) { serverRequest(req, res); }).listen(port);
        } else {
            server = https.createServer(credentials, function (req, res) { serverRequest(req, res); }).listen(port);
        }
    } else {
        if (allowHTTP2) {
            server = http2.createServer(function (req, res) { serverRequest(req, res); }).listen(port);
        } else {
            server = http.createServer(function (req, res) { serverRequest(req, res); }).listen(port);
        }
    }
}
