const commit = require("./commit");
const branch = require("./branch");
const { Select } = require("enquirer");
const { red, yellow, white, bold } = require("colorette");

module.exports = async (commandOptions) => {
	return selectOperation(commandOptions);
};

const selectOperation = (commandOptions) => {
	return operationSelect
		.run()
		.then((answer) => {
			if (answer === "Commit Changes") {
				return commit(commandOptions);
			} else if (answer === "Manage Branches") {
				return branch(commandOptions);
			} else {
				return commandAlert("No option selected");
			}
		})
		.catch((error) => {
			return commandError(error);
		});
};

const commandError = (error) => red(bold("ERROR! ")) + white(`"Could not execute command:"\n ${error}`);

const commandAlert = (message) => yellow(bold("ALERT! ")) + white(`${message}`);

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});