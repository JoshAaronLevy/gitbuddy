import core from "./core.js";
import branch from "./branch.js";
import enquirer from "enquirer";
import chalk from "chalk";

export default async (command) => {
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

const commandError = (error) => chalk.red.bold("ERROR! ") + chalk.white(`"Could not execute command:"\n ${error}`);

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new enquirer.Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});