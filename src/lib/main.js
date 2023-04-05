const commit = require("./commit");
const branch = require("./branch");
const { Select } = require("enquirer");
const chalk = require("chalk");

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

const commandError = (error) => chalk.red.bold("ERROR! ") + chalk.white(`"Could not execute command:"\n ${error}`);

const commandAlert = async (message) => chalk.red.bold("ALERT! ") + chalk.white(`${message}`);

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});