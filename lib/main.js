const core = require("./core.js");
const branch = require("./branch.js");
const { Select } = require("enquirer");
const chalk = require("chalk");

module.exports = async (command) => {
	return await selectOperation(command);
};

const selectOperation = (command) => {
	return operationSelect
		.run()
		.then(async (answer) => {
			if (answer === "Commit Changes") {
				return await core(command);
			} else {
				return await branch(command);
			}
		})
		.catch((error) => {
			return commandError(error);
		});
};

// eslint-disable-next-line quotes
const commandError = (error) => chalk.red.bold("ERROR! ") + chalk.white(`"Could not execute command:"\n` + error);

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});