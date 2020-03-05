module.exports = function (RED) {
    'use strict';
    const BaseTasmotaNode = require('./base_tasmota.js');

    const IR_DEFAULTS = {
        outputs: 1
    };

    class TasmotaIRNode extends BaseTasmotaNode {
        constructor(user_config) {
            super(user_config, RED, IR_DEFAULTS);
            this.cache = []; // switch status cache, es: [1=>'On', 2=>'Off']

            // Subscribes to state change of all the switch  stat/<device>/+
            this.MQTTSubscribe('stat', '+', (t, p) => this.onStat(t, p));
        }

        onDeviceOnline() {
            // Publish a start command to get the state of all the switches
            this.MQTTPublish('cmnd', 'POWER0');
        }

        onNodeInput(msg) {
            const payload = msg.payload;

            // combined hsv and power payload object
            if (typeof payload === 'object') {
                if (payload.IRsend) {
                    this.MQTTPublish('cmnd', 'IRsend', payload.IRsend.toString());
                }
                if (payload.IRhvac) {
                    this.MQTTPublish('cmnd', 'IRhvac', payload.IRhvac.toString());
                }
            }
        }

        onStat(mqttTopic, mqttPayloadBuf) {
            const mqttPayload = mqttPayloadBuf.toString();
            // last part of the topic must be RESULT (ignore any others)
            const lastTopic = mqttTopic.split('/').pop();

            if (!lastTopic.startsWith('RESULT')) {
                return;
            }
            var msg = {
                payload: mqttPayload
            }

            msg.payload = JSON.parse(msg.payload);

            if (!msg.payload.IrReceived) {
                return;
            }

            // everything to the same (single) output
            this.send(msg);
        }
    }

    RED.nodes.registerType('Tasmota IR', TasmotaIRNode);
};