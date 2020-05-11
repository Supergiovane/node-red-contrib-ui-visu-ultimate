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
        var htmlLowerRowPlaceholders = "";
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
            if (row.PositionInTemplate == "up") {
                htmlUpperRowPlaceholders += String.raw`
            <span class="superBaseRoomStatusRowIcon" id="pos` + index + `_{{uniqueID}}"></span>
            `;
            } else {
                htmlLowerRowPlaceholders += String.raw`
                <span class="superBaseRoomStatusRowIcon" id="pos` + index + `_{{uniqueID}}"></span>
                `;
            }

            // Create the array of topics, removing empty ones.
            const aTopics = row.TopicField.split(",");
            row.TopicFieldArray = [];
            for (let index = 0; index < aTopics.length; index++) {
                const sTopic = aTopics[index];
                // Create an object, containing the topic and the current related value (needed for OR logic)
                if (sTopic.trim() != "") row.TopicFieldArray.push({ topic: sTopic.trim(), curVal: false });
            }

        }
        // Add the placeholders for icons/texts
        html = html.split("\#\#containerUpperRow\#\#").join(htmlUpperRowPlaceholders);
        html = html.split("\#\#containerLowerRow\#\#").join(htmlLowerRowPlaceholders);

        var data = {
            config: config,
            iconRoom: fs.readFileSync(node.iconPath + "/" + config.iconOn + ".svg", "utf8")
        }
        var configAsJson = JSON.stringify(data);
        html += "<input type='hidden' ng-init='init(" + configAsJson + ")'>";
        // Save data into the context as well, accessible in the widget
        node.context().set("NodeDataRules", rows);
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
                    height: config.height,
                    format: html,                           // *REQUIRED* !!DO NOT EDIT!!
                    templateScope: "local",                 // *REQUIRED* !!DO NOT EDIT!!
                    emitOnlyNewValues: false,               // *REQUIRED* Edit this if you would like your node to only emit new values.
                    forwardInputMessages: false,            // *REQUIRED* Edit this if you would like your node to forward the input message to it's ouput.
                    storeFrontEndInputAsState: false,
                    convertBack: function (value) {
                        return value;
                    },
                    beforeEmit: function (msg, value) {// make msg.payload accessible as msg.items in widget
                        if (!msg) return;  // Ignore undefined msg
                        if (!msg.hasOwnProperty("topic")) return;
                        if (!msg.hasOwnProperty("payload")) return;

                        var oRules = node.context().get("NodeDataRules");
                        // Check incoming topic
                        for (let index = 0; index < oRules.length; index++) {
                            const oRule = oRules[index];
                            // Switch between multi topic check (in OR), or single topic
                            if (oRule.TopicFieldArray.length == 1 && oRule.TopicFieldArray[0].topic == msg.topic) {
                                // Single topic
                                oRule.TopicFieldArray[0].curVal = msg.payload;
                            } else {
                                // Multiple topic in OR, using only true/false
                                var oTopic = oRule.TopicFieldArray.find(a => a.topic == msg.topic);
                                if (typeof oTopic !== "undefined") {
                                    oTopic.curVal = msg.payload;
                                }
                            }
                        }
                        node.context().set("NodeDataRules", oRules);
                        var ret = { msg: msg, oRules: oRules };
                        return { msg: ret };
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
                        function AlignUIwithValues(oRules) {
                            for (let index = 0; index < oRules.length; index++) {
                                const oRule = oRules[index];
                                var retVal;
                                // Switch between multi topic check (in OR), or single topic
                                if (oRule.TopicFieldArray.length == 1) {// Single topic
                                    //  Eval the curVal and replace the icon/text
                                    retVal = oRule.TopicFieldArray[0].curVal;
                                } else {
                                    // Multiple topic in OR, using only true/false
                                    // At least 1 topic must be true. Find the calculated value
                                    retVal = false;
                                    for (let index = 0; index < oRule.TopicFieldArray.length; index++) {
                                        const oTopic = oRule.TopicFieldArray[index];
                                        if (oTopic.curVal) {
                                            retVal = true;
                                            break;
                                        }
                                    }

                                }
                                // Once i have the value, compare it to the rules and set appropriate icon/text
                                var oRegolaIcona = oRule.RegoleIcona.find(a => a.val == retVal);
                                // If undefined, try to verify if the rule is a rule that uses "*", that means, accepting all values
                                if (typeof oRegolaIcona === "undefined") oRegolaIcona = oRule.RegoleIcona.find(a => a.val === "*");
                                if (typeof oRegolaIcona !== "undefined") {
                                    if (oRegolaIcona.hasOwnProperty("icon")) {
                                        // Swap the icon accordingly
                                        $("#pos" + index + "_" + $scope.uniqueID).html(typeof oRegolaIcona.iconHTML !== "undefined" ? oRegolaIcona.iconHTML : "");
                                    } else if (oRegolaIcona.hasOwnProperty("text")) {
                                        // Swap the text accordingly
                                        $("#pos" + index + "_" + $scope.uniqueID).html(typeof oRegolaIcona.text !== "undefined" ? "<div style='margin-top:5px;'>" + oRegolaIcona.text.split("@").join(oRule.TopicFieldArray[0].curVal) + "</div>" : "");
                                    }
                                }
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
                            $scope.uniqueID = $scope.$eval('$id');
                            $(document).ready(function () {
                                //setTimeout(function () {
                                    //alert($scope.uniqueID + " : " + $("#divPrincipale" + $scope.uniqueID).closest("md-card").height());
                                    //alert($scope.uniqueID + " : " + $("#divPrincipale" + $scope.uniqueID).height());
                                    //var widgetHeight = $("#divPrincipale" + $scope.uniqueID).height();
                                   
                                    //$("#iconRoom" + $scope.uniqueID).attr("style", "height:" + widgetHeight-12 + "px;");

                                //}, 100)

                                $("#iconRoom" + $scope.uniqueID).html(data.iconRoom);

                                //$("#iconRoom" + $scope.uniqueID).attr("style", "height:10px;width:10px");
                                //$("#iconRoom" + $scope.uniqueID).attr("src", "data:image/svg+xml;charset=utf-8," + data.iconRoom);
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
                            //alert("UMPA " + JSON.stringify(msg.msg))
                            //alert("UMPA " + JSON.stringify(msg.oRules))
                            // The $scope.rules.rule is { "PositionInTemplate": "down", "TopicField": "1/0/9, ", "RegoleIcona": [{ "val": "0", "icon": "light_light", "col": "0", "iconHTML": "" }, { "val": "1", "icon": "light_light", "col": "1", "iconHTML": "" }], "TopicFieldArray": [{ "topic": "1/0/9", "curVal": 0 }] } "
                            // https://github.com/Supergiovane/node-red-contrib-ui-visu-ultimate/blob/master/img/jsonRoomStatusRules.png
                            AlignUIwithValues(msg.oRules);
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