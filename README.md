# node-red-contrib-ui-visu-ultimate
 Node-RED UI widget set, specific for home automation and compatible with knx-ultimate node.

 ![Sample](img/pic.png)

 ## SWITCH

 **Input messages**

 <code>msg.topic</code> sets the topic<br/>
 <code>msg.payload</code> sets the value<br/>

 ## ROOM STATUS
 
 **Configuration**

<code>Config</code> sets the common configuration node, for setting the common Style, etc..<br/>
<code>Room name</code> sets the name of the room, apperaing on the widget<br/>
<code>Room icon</code> sets the icon of the room. Begin by typing the name of the icon and the corresponding list appear. Then select the preferred icon. You can view a list of all icons with names, by clicking the pink link.<br/><br/>
<code>SIGNALLING ICONS AND VALUES</code> this is a list of signalling icons, you can add on upper and lower row of the room widget. The first row represents the **far right icon**, going from right to left on wach row. The second row is the second icon from the right, and so on...<br/>
> **first field**: select the upper/lower row<br/>
> **second field**: on the second field, select one or more topic to evaluate. You can use a single topic or multiple topics, separated by comma. The widget will the evaluate all topics in "OR", that means that at least one topic must have the desired value to trigger the rule of the next field<br/>
> **third field**: this is the rule field. You can specify here what to do whenever the widget receives a value from the topic/topics. The field is automatically filled but you can then change it.<br/>
> The **third field** accepts a JSON format string based on:<br/>
> ***val*** is the value, for example true, false, 10, "hello" or whathever value you want, to wait for. You can use the wildcard char "*" to always trigger the rule. See example below.<br/>
> ***icon*** is the icon to set if the value above is received. Alternatively, you can use **text** to set a specified text. See below the example.<br/>
> ***col*** is the icon color. You can set 0 to the default color, 1 for the highlighted color or any color you specify in the HTML format, for example #ffff<br/> 
> <br/>
> **TO SET AN ICON BASED ON RECEIVED BOOLEAN VALUE**<br/>
> The format is: {"val":true,"icon":"light_light","col":"1"}<br/>
> <br/>
> **TO SET A TEXT BASED ON WILDCHAR CHARACTER**<br/>
> The format is: {"val":"\*","text":"Temperature: @ °c","col":"0"}<br/>
> ***text*** represents the text to be written. The ***@*** symbol represents the received value. In this case, if the value is 21.5, the wirget will show *Temperature: 21.5 °c*<br/>
> <br/>
> **MULTIPLE VALUES EVALUATION**<br/>
> You can evaluate more thatn one value at once, just separate each evaluation with a **comma**<br/>
> Example: {"val":false,"icon":"light_light","col":"0"},{"val":true,"icon":"light_light","col":"1"}<br/>
> Example: {"val":"switchOn","icon":"light_light","col":"0"},{"val":"SwitchOff","icon":"light_light","col":"1"}<br/>
> Example: {"val":1,"icon":"ventilator_1","col":"1"},{"val":2,"icon":"ventilator_2","col":"1"},{"val":3,"icon":"ventilator_3","col":"1"}<br/>
> Example (in this case, **no icon is displayed** if "0"): {"val":0,"icon":"","col":"0"},{"val":1,"icon":"light_light","col":"1"}<br/>
> Example (in this case, **no text is displayed** if "0"): {"val":0,"text":"","col":"0"},{"val":1,"text":"The pump is on","col":"1"}<br/>
> Example (mixing **icons and text**): {"val":0,"icon":"light_off","col":"0"},{"val":1,"icon":"light_on","col":"0"},{"val":3,"text":"The Main Power is off!","col":"1"}<br/>

 **Input messages**

 <code>msg.topic</code> sets the topic<br/> 
 <code>msg.payload</code> sets the value<br/>