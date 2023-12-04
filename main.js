const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateVariableDefinitions = require('./variables')

const http = require('node:http');
var querystring = require('querystring');

const MAX_CAM = 6;
const MAX_CONTAINER = 3;

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config;

		this.updateStatus(InstanceStatus.Ok);

        this.resetStateArray();

		this.updateActions(); // export actions
		this.updateVariableDefinitions(); // export variable definitions
	}

    resetStateArray(){
        this.state = {};

        // Init an array with base conf
        for(var i = 0; i < MAX_CONTAINER; i++){
            var obj = {};
            for(var j = 1; j <= MAX_CAM; j++){
                obj[j] = "DOWN";
            }
            this.state[i] = obj;
        }
    }

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
	}

	// Return config fields for web config
	getConfigFields() {
        var obj = [
           {
                type: 'static-text',
                id: 'info',
                width: 12,
                label: 'Default values',
                value: "When the module detect a not initialized tallly, it will send default values"
            },
            {
				id: 'defaultbrightness',
				type: 'number',
				label: 'Default Brightness',
                width: 12,
                'default': 100,
                min: 1,
                max: 100
			},
            {
				id: 'defaultcolor',
				type: 'textinput',
				label: 'Default color (format: ff0000)',
                width: 12,
                'default': "ff0000"
			},
            {
                type: 'static-text',
                id: 'info',
                width: 12,
                label: 'Information',
                value: "Provide IP for Tallys."
            }
        ];
    
        for(var i = 1; i <= MAX_CAM; i++){
            obj.push({
				type: 'textinput',
				id: 'tallyip'+i,
				label: 'Tally IP '+i,
				width: 8
			});
            /*
            obj.push({
				type: 'textinput',
				id: 'tallyport'+i,
				label: 'Tally Port '+i,
				width: 4,
                'default': 6969
			});*/
        }

	    return obj;
	}

	updateActions() {
        var array_options = [];
        var container_array = [];

        for(var i = 0; i < MAX_CONTAINER; i++){
            container_array.push({id: i, label: "Container "+i});
        }

        array_options.push({
            id: 'container',
            type: 'dropdown',
            label: 'Container', 
            'default': 0,
            choices: container_array
        });

        for(var i = 1; i <= MAX_CAM; i++){
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                array_options.push(
                    {
                            id: 'cam'+i,
                            type: 'dropdown',
                            label: 'State for tally '+i,
                            'default': 'DOWN',
                            choices: [ {id: 'UP', label: 'UP'},{id: 'DOWN', label: 'DOWN'},{id: 'DONOTCHANGE', label: 'DO NOT CHANGE' }]
                    }
                );
            }
        }

        this.setActionDefinitions({
            tally_update_action: {
                name: 'Set a container with UP and DOWN values',
                options: array_options,
                callback: async (action, context) => {
                    this.setCompileAndSend(action);
                },
            },
            tally_reset_container: {
                name: 'Reset a container with DOWN values',
                options: [{
                    id: 'container',
                    type: 'dropdown',
                    label: 'Container', 
                    'default': 0,
                    choices: container_array
                }],
                callback: async (action, context) => {
                    this.resetToDownAContainer(action);
                },
            },
            tally_change_brightness: {
                name: 'Change brightness for all', 
                options: [{
                    id: 'brightness',
                    type: 'number',
                    label: 'Brightness',
                    'default': 100
                }],
                callback: async (action, context) => {
                    this.sendTallyBrightnessChange( action.options['brightness'] );
               },
            },
            tally_change_color: {
                name: 'Change color for all',
                options: [{
                    id: 'color',
                    type: 'textinput',
                    label: 'Color'
                }],
                callback: async (action, context) => {
                    console.log("new color "+ action.options['color'] );
                    this.sendTallyColorChange( action.options['color'] );
                }
            }
        });
	}

    /**
     * Triggered when a device is detected as not initialized
     */
    async sendDefaultValues(tallyHostname){
        try {
            console.log("Init" + tallyHostname);

            // TODO send last value
            var qs = querystring.stringify({
                init: 'true', // will trigger Initialized flag on device
                brightness: this.config['defaultbrightness'],
                color: this.config['defaultcolor']
            });
            const options = {
                hostname: tallyHostname,
                port: 80,
                path: '/?'+qs,
                method: 'GET',
            };
            const req = http.get(options, (res) => {
                console.log('statusCode:', res.statusCode);
            });
        } catch(e) {
            this.log('error', `http post request failed (${e.message})`)
        }
    }

    async sendNewState(hostname, new_state){
        try {
            var qs = querystring.stringify({
                state: new_state
            });
            const options = {
                hostname: hostname,
                port: 80,
                path: '/?'+qs,
                method: 'GET',
            };
            console.log(options);
            const req = http.get(options, (res) => {
                console.log('statusCode:', res.statusCode);
                res.on('data', (d) => {
                    console.log(d.toString());
                    // detect device as not initialized
                    if (d.toString().indexOf("Not Initialized") !== -1){
                        this.sendDefaultValues(hostname);
                    }
                });
            });
        
            this.updateStatus(InstanceStatus.Ok)
        } catch (e) {
            this.log('error', `http post request failed (${e.message})`)
            this.updatestatus(instancestatus.unknownerror, e.code)
        }
    }

    /**
     * Lofter Up and downs
     */
    async setCompileAndSend(action) {
        for(var i = 1; i <= MAX_CAM; i++){
            // for all configured cam
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                
                var tallyhostname = this.config['tallyip'+i];                
                var new_value = action.options['cam'+i];
                if (new_value == "DONOTTOUCH"){
                    continue;
                }

                this.state[action.options['container']][i] = new_value;

                // compile value
                var value = "DOWN";
                for(var j = 0; j < MAX_CONTAINER; j++){
                    if (this.state[j][i] == "UP"){
                        value = "UP";
                    }
                }
                
                // Could be more efficient in request, saving last state
                console.log("Container "+action.options['container']+" Tally #"+i+" Send State = "+new_value);
                // TODO Parallel as it is time sensitive
                this.sendNewState(tallyhostname, value);
            }
        }
    }

    async resetToDownAContainer(action){
        for(var i = 1; i <= MAX_CAM; i++){
            // for all configured cam
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                
                var tallyhostname = this.config['tallyip'+i];
                this.state[action.options['container']][i] = "DOWN";
                
                // compile value
                var value = "DOWN";
                for(var j = 0; j < MAX_CONTAINER; j++){
                    if (this.state[j][i] == "UP"){
                        value = "UP";
                    }
                }
                
                // Could be more efficient in request, saving last state
                console.log("Container "+action.options['container']+" Tally #"+i+" Send State = "+new_value);
                // TODO Parallel as it is time sensitive
                this.sendNewState(tallyhostname, value);
            }
        }
    }

    /**
     * Loop on Tallys, change brightness
     * @param {int} brightness
     */
    async sendTallyBrightnessChange(brightness) {
        
        for(var i = 1; i <= MAX_CAM; i++){
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                try {
                    var qs = querystring.stringify({
                        brightness: brightness
                    });
                    const options = {
                        hostname: this.config['tallyip'+i],
                        port: 80,
                        path: '/?'+qs,
                        method: 'GET', 
                    };
                    console.log(options);
                    const req = http.get(options, (res) => {
                        console.log('statusCode:', res.statusCode);
                    });

                    this.updateStatus(InstanceStatus.Ok)
                } catch (e) {
                    this.log('error', `http post request failed (${e.message})`)
                    this.updatestatus(instancestatus.unknownerror, e.code)
                }
            }
        }
        // end tally loop
    }

    /**
     * Loop on Tallys, change color
     * @param {string} color
     */
    async sendTallyColorChange(color) {
        for(var i = 1; i <= MAX_CAM; i++){
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                try {
                    var qs = querystring.stringify({
                        color: color
                    });
                    const options = {
                        hostname: this.config['tallyip'+i],
                        port: 80,
                        path: '/?'+qs,
                        method: 'GET',
                    };
                    console.log(options);
                    const req = http.get(options, (res) => {
                        console.log('statusCode:', res.statusCode);
                    });

                    this.updateStatus(InstanceStatus.Ok)
                } catch (e) {
                    this.log('error', `http post request failed (${e.message})`)
                    this.updatestatus(instancestatus.unknownerror, e.code)
                }
            }
        }
        // end tally loop
    }

	updateFeedbacks() {
		//UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		//UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
