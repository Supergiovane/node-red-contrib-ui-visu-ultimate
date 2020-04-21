

module.exports = (RED) => {

    var fs = require('fs');

    function visuConfig(config) {
        RED.nodes.createNode(this, config)
        var node = this
        node.dirIcons = __dirname + "/visu/icons/ws";
        node.dirStyle = __dirname + "/visu/templates/styles";//RED.settings.userDir + "/sonospollyttsstorage"; 
        node.style = typeof config.style === "undefined" ? "Dark.css" : config.style;

        // // 20/04/2020
        // RED.httpAdmin.get("/visuUltimategetIcons", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
        //     var jListOwnFiles = [];
        //     var sName = "";
        //     try {
        //         fs.readdirSync(node.dirIcons).forEach(file => {
        //             if (file.indexOf(".svg") > -1) jListOwnFiles.push({ name: file.replace(".svg", ""), svg: fs.readFileSync(node.dirIcons + "/" + file, "utf8") });
        //         });
        //     } catch (error) { }
        //     res.json(jListOwnFiles)
        // });

        // 20/04/2020
        RED.httpAdmin.get("/visuUltimategetOnlyIconNames", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var jListOwnFiles = [];
            var sName = "";
            try {
                fs.readdirSync(node.dirIcons).forEach(file => {
                    if (file.indexOf(".svg") > -1) jListOwnFiles.push({ name: file.replace(".svg", ""), filename: file });
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


        // 20/04/2020
        RED.httpAdmin.get("/visuUltimategetIconsHTML", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var jListOwnFiles = [];
            var sList = "";
            var sCSS = `<html><body><style>
            #iconList { list-style-type: none; margin: 1; padding: 1; width: 100%;}
            #iconList li { margin: 1px; padding: 2px; float: left; width: 104px; height: 104px; font-size: 0.8em; text-align: center; background: dimgray; color: lightgray;}
            </style>
            <ol id=\"iconList\">`;
            try {
                fs.readdirSync(node.dirIcons).forEach(file => {
                    if (file.indexOf(".svg") > -1) sList += "<li class=\"ui-state-default\">" + file.replace(".svg", "") + "<div style=\"left: 0px; top: 0px;  width: 62px; height: 62px;\">" + fs.readFileSync(node.dirIcons + "/" + file, "utf8") + "</div></li>";
                });
            } catch (error) { }
            res.write(sCSS + sList + "</ol>" + "</body></html>");
            //res.write(fs.readFileSync(__dirname + "/visu/iconList.html", "utf8"));
            res.end();
        });

        // 20/04/2020
        RED.httpAdmin.get("/visuUltimategetIcon", RED.auth.needsPermission('visuConfig.read'), function (req, res) {
            var sIcon = "";
            try {
                sIcon = fs.readFileSync(node.dirIcons + "/" + req.query.file + ".svg", "utf8");
            } catch (error) { }
            res.json({ icona: sIcon });
            //res.end();
        });

    }



    RED.nodes.registerType("visu-config", visuConfig);
}
