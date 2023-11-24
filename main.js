const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateVariableDefinitions = require('./variables')

const MAX_CAM = 3;

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateVariableDefinitions() // export variable definitions
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
                label: 'Information',
                value: "Provide 1 to 5 Tally m5atom-matrix node. Default port is 6969"
            }
        ];
    
        for(var i = 1; i <= MAX_CAM; i++){
            obj.push({
				type: 'textinput',
				id: 'tallyip'+i,
				label: 'Tally IP '+i,
				width: 8
			});
            obj.push(
			{
				type: 'textinput',
				id: 'tallyport'+i,
				label: 'Tally Port '+i,
				width: 4,
                'default': 6969
			});
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
                        choices: [ {id: 'UP', label: 'UP'},{id: 'DOWN', label: 'DOWN'}]
                }
            );
        }

        this.setActionDefinitions({
            tally_update_action: {
                name: 'Update Tally State',
                options: array_options,
                callback: async (event) => {
                    console.log('Hello world!', event.options)
                },
            },
        });
	}

	updateFeedbacks() {
		//UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		//UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
