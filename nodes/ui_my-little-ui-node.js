/**
 * Copyright 2018 Seth350
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/


/*************************************************************************
 * !!REQUIRED!!
 * A ui-node must always begin with the following function.
 * module.exports = function(RED) {your code here}
 * There is no need to edit this line.
 */

module.exports = function (RED) {

    var fs = require('fs');

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty('group')) {
            node.error(RED._('Light.error.no-group'));
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
            node: node
        }
        var configAsJson = JSON.stringify(data);
        html += "<input type='hidden' ng-init='init(" + configAsJson + ")'>";
        return html;
    }
    var ui = undefined;
    function MyLittleUiNode(config) {


        try {

            // Initialize node
            RED.nodes.createNode(this, config);
            var node = this;

            node.server = RED.nodes.getNode(config.server)
            node.fileStyle = __dirname + "/visu/templates/styles/" + node.server.style;
            node.fileTemplate = __dirname + "/visu/templates/Light.html";
            node.icon = __dirname + "/visu/icons/ws";
            node.curValOnOff = false;
            node.control = config.control || "";
            node.controlPERCENT = config.controlPERCENT || "";
            node.status = config.status || "";
            node.statusPERCENT = config.statusPERCENT || "";
            node.name = config.name || "Light";

            node.iconOffHtml = fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8");
            node.iconOnHtml = fs.readFileSync(node.icon + "/" + config.iconOn + ".svg", "utf8").split("\#fff").join("#FFA121");


            if (checkConfig(node, config)) {
                if (ui === undefined) {
                    ui = RED.require("node-red-dashboard")(RED);
                }
    
                var html = HTML(config,node);
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
                        return { msg: { items: value } };
                    },
                    beforeSend: function (msg, orig) {
                        if (orig) {
                            return node.HandleFromDash(orig.msg);
    
                            //return orig.msg;
                        }
                    },
                    initController: function ($scope, events) {
                        $scope.click = function (item, selected) {
                            $scope.data.node.curValOnOff = !$scope.data.node.curValOnOff;
                            if ($scope.data.node.curValOnOff) {
                                $("#iconOnOff").html($scope.data.node.iconOnHtml);
                            } else {
                                $("#iconOnOff").html($scope.data.node.iconOffHtml);
                            }
                            if (selected) {
                                item.selected = selected;
                            }
                            $scope.send({ payload: $scope.data.node.curValOnOff });
    
                        };
    
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
                            $("#iconOnOff").html($scope.data.node.iconOffHtml);
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
                            // The payload contains the new text, which we will store on the scope (in the model)
                            $scope.iconOnOff = msg.payload;
                        });

                    }
                });
            }
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.warn(e);		// catch any errors that may occur and display them in the web browsers console
        }
 node.UIToggle = val => {

        }

        node.on("input", function (msg) {
            node.curValOnOff = msg.payload;

        });


        node.HandleFromDash = (msg) => {
            RED.log.warn("BANANA " + JSON.stringify(msg))
            return { payload: msg.payload, destination: node.control }

            //RED.log.warn("BANANA " + JSON.stringify(msg))

        }
        /*******************************************************************
        * !!REQUIRED!!
        * TODO: Get with team on purpose of this node.
        * There is no need to edit these lines.
        */
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
    RED.nodes.registerType("ui_my-little-ui-node", MyLittleUiNode);
}