const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateVariableDefinitions = require('./variables')

const http = require('node:http');
var querystring = require('querystring');

const MAX_CAM = 6;

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config;

		this.updateStatus(InstanceStatus.Ok);

		this.updateActions(); // export actions
		this.updateVariableDefinitions(); // export variable definitions
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
				id: 'defaultbrightness',
				type: 'number',
				label: 'Default Brightness (when the module detect a not initialized tallly, it will send default values)',
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
                value: "Provide 3 to 5 Tally m5atom-matrix node."
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
        for(var i = 1; i <= MAX_CAM; i++){
            array_options.push(
                {
                        id: 'cam'+i,
                        type: 'dropdown',
                        label: 'State for tally '+i,
                        'default': 'UP',
                        choices: [ {id: 'UP', label: 'UP'},{id: 'DOWN', label: 'DOWN'},{id: 'DONOTTOUCH', label: 'DO NOT CHANGE' }]
                }
            );
        }

        this.setActionDefinitions({
            tally_update_action: {
                name: 'Update tally state',
                options: array_options,
                callback: async (action, context) => {
                    this.sendTallyCommand(action);
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

    /**
     * Lofter Up and downs
     */
    async sendTallyCommand(action) {
        for(var i = 1; i <= MAX_CAM; i++){
            if (this.config['tallyip'+i] != "" && typeof(this.config['tallyip'+i]) != "undefined"){
                var tallyhostname = this.config['tallyip'+i];
                try {
                    var new_state = action.options['cam'+i];
                    if (new_state == "DONOTTOUCH"){
                        continue;
                    }
                    var qs = querystring.stringify({
                        state: new_state
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
                        res.on('data', (d) => {
                            console.log(d.toString());
                            // detect device as not initialized
                            if (d.toString().indexOf("Not Initialized") !== -1){
                                this.sendDefaultValues(tallyhostname);
                            }
                        });
                    });

                    this.updateStatus(InstanceStatus.Ok)
                } catch (e) {
                    this.log('error', `http post request failed (${e.message})`)
                    this.updatestatus(instancestatus.unknownerror, e.code)
                }
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
