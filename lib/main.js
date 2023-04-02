import commit from "./commit.js";
import branch from "./branch.js";
import enquirer from "enquirer";
import chalk from "chalk";

export default async (commandOptions) => {
	return await selectOperation(commandOptions);
};

const selectOperation = (commandOptions) => {
	return operationSelect
		.run()
		.then(async (answer) => {
			if (answer === "Commit Changes") {
				return await commit(commandOptions);
			} else {
				return await branch(commandOptions);
			}
		})
		.catch((error) => {
			return commandError(error);
		});
};

const commandError = (error) => chalk.red.bold("ERROR! ") + chalk.white(`"Could not execute commandOptions:"\n ${error}`);

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new enquirer.Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});