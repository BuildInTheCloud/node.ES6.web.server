
exports.presenter = function (req, res, domain, settings, useCloudData, configName, userName, local) {
    var requestHost = req.headers.host.toLowerCase();
    var requestReferer = req.headers.referer;
    var requestHttpVersion = req.httpVersion;
    var requestURL = req.url;
    var requestMethod = req.method;
    //-- if default azure site, list all sites
    if (domain.indexOf("azurewebsites.net") > -1) {
        var sHTM = "<h1>Azure Web Sites</h1>";
        for (var node in settings.endpoint) {
            if (node != "azurewebsites.net") {
                sHTM += "<a href=\"http://preview." + node + "\" target=\"_blank\">preview</a> <a href=\"http://www." + node + "\" target=\"_blank\">www</a> " + node + "<br/>";
            }
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(sHTM);
    } else if (requestURL == "/DHTMLPlus-content-edit.js") {
        var fs = require("fs");
        fs.readFile("./DHTMLPlus-content-edit.js", "utf8", function (err, data) {
            if (err) {
                res.writeHead(404, { 'Content-Type': "text/javascript", 'error': 'File Not Found.' });
                res.end("OPPS");
            } else {
                res.writeHead(200, { 'Content-Type': "text/javascript" });
                res.end(data);
            }
        });
    } else if (requestURL == "/DHTMLPlus-content-edit.css") {
        var fs = require("fs");
        fs.readFile("./DHTMLPlus-content-edit.css", "utf8", function (err, data) {
            if (err) {
                res.writeHead(404, { 'Content-Type': "text/css", 'error': 'File Not Found.' });
                res.end("OPPS");
            } else {
                res.writeHead(200, { 'Content-Type': "text/css" });
                res.end(data);
            }
        });
    } else if (requestURL.startsWith("/publish.htm") && configName == "LOCAL") {
        console.log("PUBLISH: "+ domain);
        var path = {"params" : {} };
        if (requestURL.endsWith("deploy=true")) { path = {"params" : {"deploy" : true } }; }
        var pub = require("./template-push-to-blob.js");
        pub.publishTemplates(req, res, path, domain, settings, configName);
    } else if (requestURL.startsWith("/video-hasissues")) {
        var videoHasIssues = require("./video-hasissues.js");
        if (requestURL.startsWith("/video-hasissues/get-list")) {
            videoHasIssues.getList(req, res, domain, settings, useCloudData, configName, userName, local);
        } else if (requestURL.startsWith("/video-hasissues/update-database")) {
            videoHasIssues.updateDatabase(req, res, domain, settings, useCloudData, configName, userName, local);
        } else if (requestURL.startsWith("/video-hasissues/sort-database")) {
            videoHasIssues.sortDatabase(req, res, domain, settings, useCloudData, configName, userName, local);
        } else if (requestURL.startsWith("/video-hasissues/get-movie")) {

        }
    } else {
        if (settings.endpoint[domain].type == "DHTMLPlus") {
            var template = require('./template-data-merge.js');
            template.templateDataMerge(req, res, domain, settings, useCloudData, configName, userName, local);
        } else if (settings.endpoint[domain].type == "angularJS") {
            var template = require('./angularJS-site.js');
            template.responseFile(req, res, domain, settings, useCloudData, configName, userName, local);
        } else if (settings.endpoint[domain].type == "static") {
            var template = require('./static-site.js');
            template.responseFile(req, res, domain, settings, useCloudData, configName, userName, local);
        } else {
            res.writeHead(404, { 'Content-Type': "text/html", 'error': 'File Not Found.' });
            res.end("OPPS");
        }
    }
};

String.prototype.endsWith = function(suffix) { return this.indexOf(suffix, this.length - suffix.length) !== -1; };
String.prototype.startsWith = function(str) {return (this.match("^"+str)==str)};

