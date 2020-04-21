

module.exports = (RED) => {

    var fs = require('fs');

    function visuConfig(config) {
        RED.nodes.createNode(this, config)
        var node = this
        node.dirIcons = __dirname + "/visu/icons/ws";
        node.dirStyle = __dirname + "/visu/templates/styles";//RED.settings.userDir + "/sonospollyttsstorage"; 
        node.style = typeof config.style === "undefined" ? "Dark.css" : config.style;

        // 20/04/2020
        RED.httpAdmin.get("/visuUltimategetIcons", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var jListOwnFiles = [];
            var sName = "";
            try {
                fs.readdirSync(node.dirIcons).forEach(file => {
                    if (file.indexOf(".svg")>-1) jListOwnFiles.push({ name: file.replace(".svg", ""), svg: fs.readFileSync(node.dirIcons + "/" + file, "utf8") });
                });
            } catch (error) { }
            res.json(jListOwnFiles)
        });

         // 20/04/2020
         RED.httpAdmin.get("/visuUltimategetOnlyIconNames", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var jListOwnFiles = [];
            var sName = "";
            try {
                fs.readdirSync(node.dirIcons).forEach(file => {
                    if (file.indexOf(".svg")>-1) jListOwnFiles.push({ name: file.replace(".svg", ""), filename: file });
                });
            } catch (error) { }
            res.json(jListOwnFiles)
        });

        // 20/04/2020
        RED.httpAdmin.get("/visuUltimategetStyle", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var jListOwnFiles = [];
            var sName = "";
            try {
                fs.readdirSync(node.dirStyle).forEach(file => {
                    sName = file.replace(".css", "");
                    jListOwnFiles.push({ name: sName, filename: file });
                });

            } catch (error) { }
            res.json(jListOwnFiles)
        });

    }



    RED.nodes.registerType("visu-config", visuConfig);
}
