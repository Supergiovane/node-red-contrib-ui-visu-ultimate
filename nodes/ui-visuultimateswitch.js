module.exports = function (RED) {

    var fs = require('fs');

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty('group')) {
            node.error(RED._('ui-visuultimateswitch.error.no-group'));
            return false;
        }
        else {
            return true;
        }
    }

    function HTML(config, node) {
        var html = "<style>" + fs.readFileSync(node.fileStyle, "utf8") + "</style>" + fs.readFileSync(node.fileTemplate, "utf8");
        try {
            var data = {
                config: config,
                iconOffHtml: fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8"),
                iconOnHtml: fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8").split("\#fff").join("#FFA121")
            }
        } catch (error) { }
       
        var configAsJson = JSON.stringify(data);
        html += "<input type='hidden' ng-init='init(" + configAsJson + ")'>";
        return html;
    }


    var ui = undefined;
    function uiswitch(config) {


        try {

            // Initialize node
            RED.nodes.createNode(this, config);
            var node = this;

            node.server = RED.nodes.getNode(config.server)
            node.fileStyle = __dirname + "/visu/templates/styles/" + node.server.style;
            node.fileTemplate = __dirname + "/visu/templates/ui-visuultimateswitch.html";
            node.icon = __dirname + "/visu/icons/ws";
            node.name = config.name || "Light";

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
                        $scope.curValOnOff = false;
                        $scope.curValPERCENT = 0;

                        $scope.click = function (item, selected) {
                            if (item == "toggle") {

                                $scope.curValOnOff = !$scope.curValOnOff;
                                $scope.send({ payload: false, destination: $scope.data.config.control });
                                
                                AlignUIwithValues();
                                if (selected) {
                                    item.selected = selected;
                                }
                                
                            } else if (item == "percentMINUS") {
                                $scope.curValPERCENT -= 20;
                                if ($scope.curValPERCENT < 0) $scope.curValPERCENT = 0;
                                AutoSwitchIfPercent();
                                AlignUIwithValues();

                            } else if (item == "percentPLUS") {
                                $scope.curValPERCENT += 20;
                                if ($scope.curValPERCENT > 100) $scope.curValPERCENT = 100;
                                AutoSwitchIfPercent();
                                AlignUIwithValues();
                            }
                        };

                        // Auto switch ON / OFF based on Percentage
                        function AutoSwitchIfPercent() {
                            // Switch on if off and off if on
                            if ($scope.curValPERCENT > 0) {
                                if (!Boolean($scope.curValOnOff)) {
                                    // Switch on
                                    $scope.curValOnOff = true;
                                    $scope.send({ payload: $scope.curValOnOff, destination: $scope.data.config.control });
                                    // Then set the new val
                                    setTimeout(function () { $scope.send({ payload: $scope.curValPERCENT, destination: $scope.data.config.controlPERCENT }); }, 1000)
                                } else {
                                    // Set the new val
                                    $scope.send({ payload: $scope.curValPERCENT, destination: $scope.data.config.controlPERCENT });
                                }
                            } else {
                                // Switch Off
                                $scope.curValOnOff = false;
                                // Set the percent
                                $scope.send({ payload: $scope.curValPERCENT, destination: $scope.data.config.controlPERCENT });
                                // Then switch off
                                setTimeout(function () { $scope.send({ payload: $scope.curValOnOff, destination: $scope.data.config.control }); }, 1000);
                            }
                        }

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
                            $scope.iconOnHtml = data.iconOnHtml;
                            $scope.iconOffHtml = data.iconOffHtml;
                           
                            //node.curValOnOff = true;
                            $(document).ready(function () {
                                AlignUIwithValues();
                             
                            });
                        };

                        /*
                        * HANDLE MESSAGE FROM NODE-RED FLOW TO DASHBOARD
                        * Use $scope.$watch 'msg' to manipulate your user interface when a message from the Node-RED flow arrives.
                        * As soon as the message arrives in the dashboard, the callback function will be executed.
                        */
                        $scope.$watch('msg', function (msg) {
                            if (!msg) { return; } // Ignore undefined msg
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
    RED.nodes.registerType("ui_ui-visuultimateswitch", uiswitch);
}