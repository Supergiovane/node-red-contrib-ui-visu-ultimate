module.exports = function (RED) {

    var fs = require('fs');

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty('group')) {
            node.error(RED._('ui-visuultimateroomstatus.error.no-group'));
            return false;
        }
        else {
            return true;
        }
    }

    function HTML(config, node) {
        var html = "<style>" + fs.readFileSync(node.fileStyle, "utf8") + "</style>" + fs.readFileSync(node.fileTemplate, "utf8");

        // 01/05/2020 iterate the rule rows to add the html path of the icons and to create the array of topics to be heard for changes
        var rows = config.rules;
        var htmlUpperRowPlaceholders = "";
        for (let index = 0; index < rows.length; index++) {
            var row = rows[index];
            // row is { PositionInTemplate: oPositionInTemplate, TopicField: oTopicField, RegoleIcona: oRegoleIcona }
            row.RegoleIcona = row.RegoleIcona.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": '); // Clean JSON 
            row.RegoleIcona = JSON.parse("[" + row.RegoleIcona + "]"); // and get object
            var oIconRules = row.RegoleIcona;
            for (let index = 0; index < oIconRules.length; index++) {
                var iconRule = oIconRules[index];
                if (iconRule.hasOwnProperty("icon")) {
                    try {
                        if (iconRule.col == "0") { // Set the colors
                            iconRule.iconHTML = fs.readFileSync(node.iconPath + "/" + iconRule.icon + ".svg", "utf8")
                        } else if (iconRule.col == "1") {
                            iconRule.iconHTML = fs.readFileSync(node.iconPath + "/" + iconRule.icon + ".svg", "utf8").split("\#fff").join("#FFA121")
                        } else {
                            iconRule.iconHTML = fs.readFileSync(node.iconPath + "/" + iconRule.icon + ".svg", "utf8").split("\#fff").join(iconRule.col)
                        }
                    } catch (error) { RED.log.error("Visu-Ultimate: Error generating HTML: ") + error }
                }
            }
            htmlUpperRowPlaceholders += String.raw`
            <div id="rule` + index + `_{{uniqueID}}"></div>
            `;
            // Create the array of topics, removing empty ones.
            const aTopics = row.TopicField.split(",");
            row.TopicFieldArray = [];
            for (let index = 0; index < aTopics.length; index++) {
                const sTopic = aTopics[index];
                // Create an object, containing the topic and the current related value (needed for OR logic)
                if (sTopic.trim() != "") row.TopicFieldArray.push({ topic: sTopic, curVal: 0 });
            }

        }
        // Add the placeholders for icons/texts
        html = html.split("\#\#containerUpperRow\#\#").join(htmlUpperRowPlaceholders);

        var data = {
            config: config,
            rules: rows
        }
        var configAsJson = JSON.stringify(data);
        html += "<input type='hidden' ng-init='init(" + configAsJson + ")'>";
        return html;
    }

    var ui = undefined;
    function RoomStatusNode(config) {

        try {

            // Initialize node
            RED.nodes.createNode(this, config);
            var node = this;

            node.server = RED.nodes.getNode(config.server)
            node.fileStyle = __dirname + "/visu/templates/styles/" + node.server.style;
            node.fileTemplate = __dirname + "/visu/templates/ui-visuultimateroomstatus.html";
            node.iconPath = __dirname + "/visu/icons/ws";
            node.name = config.name || "Room Status";

            if (checkConfig(node, config)) {
                if (ui === undefined) {
                    ui = RED.require("node-red-dashboard")(RED);
                }

                var html = HTML(config, node);

                var done = ui.addWidget({
                    node: node,                             // *REQUIRED* !!DO NOT EDIT!!
                    order: config.order,                    // *REQUIRED* !!DO NOT EDIT!!
                    group: config.group,                    // *REQUIRED* !!DO NOT EDIT!!
                    width: config.width,                    // *REQUIRED* !!DO NOT EDIT!!
                    height: config.height,                  // *REQUIRED* !!DO NOT EDIT!!
                    format: html,                           // *REQUIRED* !!DO NOT EDIT!!
                    templateScope: "local",                 // *REQUIRED* !!DO NOT EDIT!!
                    emitOnlyNewValues: false,               // *REQUIRED* Edit this if you would like your node to only emit new values.
                    forwardInputMessages: false,            // *REQUIRED* Edit this if you would like your node to forward the input message to it's ouput.
                    storeFrontEndInputAsState: false,
                    convertBack: function (value) {
                        return value;
                    },
                    beforeEmit: function (msg, value) {
                        // make msg.payload accessible as msg.items in widget
                        return { msg: msg };
                    },
                    beforeSend: function (msg, orig) {
                        if (orig) {
                            return node.HandleFromDash(orig.msg);
                        }
                    },
                    initController: function ($scope, events) {
                        $scope.uniqueID = $scope.$eval('$id');

                        $scope.click = function (item, selected) {
                            if (item == "navigate") {
                                $scope.send({ payload: false, destination: $scope.data.config.control });
                            }
                        };


                        // Align UI with values in the scope
                        function AlignUIwithValues() {

                            // 1 BIT
                            if ($scope.curValOnOff) {
                                $("#iconOnOff" + $scope.uniqueID).html($scope.iconOnHtml);
                            } else {
                                $("#iconOnOff" + $scope.uniqueID).html($scope.iconOffHtml);
                            }

                            // PERCENT
                            // Making old 80 things
                            if (typeof $scope.data.config.controlPERCENT !== "undefined" && $scope.data.config.controlPERCENT !== "") {
                                if ($scope.curValPERCENT > 0) {
                                    var activeLine = 10 - ($scope.curValPERCENT / 10);
                                    var inactiveLine = 10 - activeLine;
                                    $("#curValPERCENTString" + $scope.uniqueID).html("&nbsp;&nbsp;&nbsp;<font class='superBaseActive'>" + "_".repeat(inactiveLine) + "</font>" + "<font class='superBaseGray'>" + "_".repeat(activeLine));

                                } else {
                                    $("#curValPERCENTString" + $scope.uniqueID).html("&nbsp;&nbsp;&nbsp;<font class='superBaseGray'>" + "_".repeat(10) + "</font>");
                                }
                            } else {
                                // Hide the % control
                                $("#iconMINUS" + $scope.uniqueID).hide();
                                $("#iconPLUS" + $scope.uniqueID).hide();
                                $("#curValPERCENTString" + $scope.uniqueID).hide();
                            }
                        }

                        /*
                        * STORE THE CONFIGURATION FROM NODE-RED FLOW INTO THE DASHBOARD
                        * The configuration (from the node's config screen in the flow editor) should be saved in the $scope.
                        * This 'init' function should be called from a single html element (via ng-init) in the HTML function,
                        * since the configuration will be available there.
                        *
                        */
                        $scope.init = function (data) {
                            $scope.data = data;
                            $(document).ready(function () {
                                AlignUIwithValues();
                            });
                        };

                        /*
                        * HANDLE MESSAGE FROM NODE-RED FLOW TO DASHBOARD
                        * Use $scope.$watch 'msg' to manipulate your user interface when a message from the Node-RED flow arrives.
                        * As soon as the message arrives in the dashboard, the callback function will be executed.
                        * Inside the callback function, you can manipulate your node's HTML attributes and elements.  That way you
                        * can update the dashboard based on data from the input message.
                        * E.g. change the text color based on the value of msg.color.
                        */
                        $scope.$watch('msg', function (msg) {
                            if (!msg) return;  // Ignore undefined msg
                            if (!msg.hasOwnProperty("topic")) return;
                            if (!msg.hasOwnProperty("payload")) return;

                            // The $scope.rules.rule is { "PositionInTemplate": "down", "TopicField": "1/0/9, ", "RegoleIcona": [{ "val": "0", "icon": "light_light", "col": "0", "iconHTML": "" }, { "val": "1", "icon": "light_light", "col": "1", "iconHTML": "" }], "TopicFieldArray": [{ "topic": "1/0/9", "curVal": 0 }] } "
                            // Check incoming topic
                            var oRules = $scope.data.rules;
                            for (let index = 0; index < oRules.length; index++) {
                                const oRule = oRules[index];
                                $scope.send({ payload: JSON.stringify(oRule) });

                            }

                            // Control ON/OFF
                            if (msg.topic === $scope.data.config.control || msg.topic === $scope.data.config.status) {
                                $scope.curValOnOff = msg.payload;
                            }

                            // Control PERCENT
                            if (msg.topic === $scope.data.config.controlPERCENT || msg.topic === $scope.data.config.statusPERCENT) {
                                $scope.curValPERCENT = msg.payload;
                            }
                            AlignUIwithValues();
                        });
                    }
                });
            }
        }
        catch (e) {
            RED.log.error("Visu-Ultimate: error " + e);		// catch any errors that may occur and display them in the web browsers console
        }


        node.HandleFromDash = (msg) => {
            //RED.log.warn("BANANA " + JSON.stringify(msg))
            return msg;
        }

        node.on("close", function () {
            if (done) {
                done();
            }
        });
        /*******************************************************************/
    }


    /*******************************************************************
    * !!REQUIRED!!
    * Registers the node with a name, and a configuration.
    * You must enter the SAME name of your node you registered (in the html file) and enter the name
    * of the function (see line #87) that will return your nodes's configuration.
    * Note: the name must begin with "ui_".
    */
    RED.nodes.registerType("ui_ui-visuultimateroomstatus", RoomStatusNode);
}