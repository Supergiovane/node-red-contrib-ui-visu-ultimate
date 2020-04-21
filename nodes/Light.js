module.exports = function (RED) {

    var fs = require('fs');
    // Holds a reference to node-red-dashboard module.
    // Initialized at #1.
    var ui = undefined;

    // Node initialization function
    function Light(config) {
        // Initialize node
        RED.nodes.createNode(this, config);
        var node = this;
        node.server = RED.nodes.getNode(config.server)
        node.fileStyle = __dirname + "/visu/templates/styles/" + node.server.style;
        node.fileTemplate = __dirname + "/visu/templates/Light.html";
        node.icon = __dirname + "/visu/icons/ws";
        node.html = "<style>" + fs.readFileSync(node.fileStyle, "utf8") + "</style>" + fs.readFileSync(node.fileTemplate, "utf8");

        if (ui === undefined) {
            // #1: Load node-red-dashboard module.
            // Should use RED.require API to cope with loading different
            // module.  And it should also be executed at node
            // initialization time to be loaded after initialization of
            // node-red-dashboard module.
            // 
            ui = RED.require("node-red-dashboard")(RED);
        }




        var done = null;
        // Generate HTML/Angular code
        var html = node.html;
        // Initialize Node-RED Dashboard widget
        // see details: https://github.com/node-red/node-red-ui-nodes/blob/master/docs/api.md
        done = ui.addWidget({
            node: node,			// controlling node
            width: config.width,	// width of widget
            height: config.height,	// height of widget
            format: html,		// HTML/Angular code
            templateScope: "local",	// scope of HTML/Angular(local/global)*
            group: config.group,	// belonging Dashboard group
            emitOnlyNewValues: false,
            forwardInputMessages: false,
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
                    return orig.msg;
                }
            },
            initController: function ($scope, events) {
                // initialize $scope.click to send clicked widget item
                // used as ng-click="click(item, selected)"
                $scope.click = function (item, selected) {
                    if (selected) {
                        item.selected = selected;
                    }
                    $scope.send({ payload: item });
                };
            }
        });


        node.on("close", function (done) {
            if (done) {
                // finalize widget on close
                done();
            }
        });
    }


    // register Light node
    RED.nodes.registerType('Light', Light);
};
