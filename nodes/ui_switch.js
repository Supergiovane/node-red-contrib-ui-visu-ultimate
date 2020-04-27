module.exports = function (RED) {

    var fs = require('fs');

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty('group')) {
            node.error(RED._('ui_switch.error.no-group'));
            return false;
        }
        else {
            return true;
        }
    }

    function HTML(config, node) {
        var html = "<style>" + fs.readFileSync(node.fileStyle, "utf8") + "</style>" + fs.readFileSync(node.fileTemplate, "utf8");
        var data = {
            config: config,
            node: node,
            uniqueID: node.id.split(".").join("")
        }
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
            node.fileTemplate = __dirname + "/visu/templates/ui_switch.html";
            node.icon = __dirname + "/visu/icons/ws";
            node.curValOnOff = false;
            node.curValPERCENT = 0;
            node.name = config.name || "Light";

            node.iconOffHtml = fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8");
            node.iconOnHtml = fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8").split("\#fff").join("#FFA121");


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

                        $scope.click = function (item, selected) {
                            if (item == "toggle") {
                                $scope.data.node.curValOnOff = !$scope.data.node.curValOnOff;
                                AlignUIwithValues();
                                if (selected) {
                                    item.selected = selected;
                                }
                                $scope.send({ payload: $scope.data.node.curValOnOff, destination: $scope.data.config.control });

                            } else if (item == "percentMINUS") {
                                $scope.data.node.curValPERCENT -= 20;
                                if ($scope.data.node.curValPERCENT < 0) $scope.data.node.curValPERCENT = 0;
                                AutoSwitchIfPercent();
                                AlignUIwithValues();

                            } else if (item == "percentPLUS") {
                                $scope.data.node.curValPERCENT += 20;
                                if ($scope.data.node.curValPERCENT > 100) $scope.data.node.curValPERCENT = 100;
                                AutoSwitchIfPercent();
                                AlignUIwithValues();
                            }
                        };

                        // Auto switch ON / OFF based on Percentage
                        function AutoSwitchIfPercent() {
                            // Switch on if off and off if on
                            if ($scope.data.node.curValPERCENT > 0) {
                                if (!Boolean($scope.data.node.curValOnOff)) {
                                    // Switch on
                                    $scope.data.node.curValOnOff = true;
                                    $scope.send({ payload: $scope.data.node.curValOnOff, destination: $scope.data.config.control });
                                    // Then set the new val
                                    setTimeout(function () { $scope.send({ payload: $scope.data.node.curValPERCENT, destination: $scope.data.config.controlPERCENT }); }, 1000)
                                } else {
                                    // Set the new val
                                    $scope.send({ payload: $scope.data.node.curValPERCENT, destination: $scope.data.config.controlPERCENT });
                                }
                            } else {
                                // Switch Off
                                $scope.data.node.curValOnOff = false;
                                // Set the percent
                                $scope.send({ payload: $scope.data.node.curValPERCENT, destination: $scope.data.config.controlPERCENT });
                                // Then switch off
                                setTimeout(function () { $scope.send({ payload: $scope.data.node.curValOnOff, destination: $scope.data.config.control }); }, 1000);
                            }
                        }

                        // Align UI with values in the scope
                        function AlignUIwithValues() {
                            // 1 BIT
                            if ($scope.data.node.curValOnOff) {
                                $("#iconOnOff" + $scope.data.uniqueID).html($scope.data.node.iconOnHtml);
                            } else {
                                $("#iconOnOff" + $scope.data.uniqueID).html($scope.data.node.iconOffHtml);
                            }

                            // PERCENT
                            // Making old 80 things
                            if (typeof $scope.data.config.controlPERCENT !== "undefined" && $scope.data.config.controlPERCENT !== "") {
                                if ($scope.data.node.curValPERCENT > 0) {
                                    var activeLine = 10 - ($scope.data.node.curValPERCENT / 10);
                                    var inactiveLine = 10 - activeLine;
                                    $("#curValPERCENTString" + $scope.data.uniqueID).html("&nbsp;&nbsp;&nbsp;<font class='superBaseActive'>" + "_".repeat(inactiveLine) + "</font>" + "<font class='superBaseGray'>" + "_".repeat(activeLine));

                                } else {
                                    $("#curValPERCENTString" + $scope.data.uniqueID).html("&nbsp;&nbsp;&nbsp;<font class='superBaseGray'>" + "_".repeat(10) + "</font>");
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
                        $scope.init = function (config) {
                            $scope.data = config; // Imposto i dati da usare nel cazzo di angular di merda.
                            // The configuration contains the default text, which needs to be stored in the scope
                            // (to make sure it will be displayed via the model).
                            setTimeout(a = () => {
                                $("#iconOnOff" + $scope.data.uniqueID).html($scope.data.node.iconOffHtml);
                                if (typeof $scope.data.config.controlPERCENT === "undefined" || $scope.data.config.controlPERCENT == "") {
                                    $("#iconMINUS" + $scope.data.uniqueID).hide();
                                    $("#iconPLUS" + $scope.data.uniqueID).hide();
                                    $("#curValPERCENTString" + $scope.data.uniqueID).hide();
                                }
                            }, 100);
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
                            if (!msg) { return; } // Ignore undefined msg

                            // Control ON/OFF
                            if (msg.topic === $scope.data.config.control || msg.topic === $scope.data.config.status) {
                                $scope.data.node.curValOnOff = msg.payload;
                            }

                            // Control PERCENT
                            if (msg.topic === $scope.data.config.controlPERCENT || msg.topic === $scope.data.config.statusPERCENT) {
                                $scope.data.node.curValPERCENT = msg.payload;
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
    RED.nodes.registerType("ui_switch", uiswitch);
}