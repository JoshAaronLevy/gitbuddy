import { red, white, yellow, bold } from "colorette";
import enquirer from "enquirer";
import commit from "./commit.mjs";
import branch from "./branch.mjs";

export default (commandOptions) => {
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

const commandError = async (error) => {
	return red(bold("ERROR! ")) + white(`"Could not execute commandOptions:"\n ${error}`);
};

const commandAlert = async (message) => {
	return yellow(bold("Alert! ")) + white(`${message}`);
};

/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new enquirer.Select({
	name: "selectOperation",
	message: "What would you like to do?",
	choices: ["Commit Changes", "Manage Branches"]
});