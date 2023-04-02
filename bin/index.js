import { Command } from "commander";
const program = new Command();
import main from "../lib/main.js";
import branch from "../lib/branch.js";
import commit from "../lib/commit.js";

let commandOptions = {
	flags: {
		all: false,
		push: false,
		commit: false,
		branch: false
	},
	commitMessage: null
};

program.description("Example: gitbuddy \"I fixed a bug\"")
	.option("[message]", "Commit message")
	.option("-A, -a, --all", "Stage all files")
	.option("-p, --push", "Automatically push to remote repository")
	.option("-b, --branch", "Manage branches")
	.option("-c, --commit", "Commit prompts")
	.version("5.0.3", "-v, --version")
	.action(async (message, command) => {
		if (Object.keys(command._optionValues).length > 0) {
			Object.keys(command._optionValues).map((key) => commandOptions.flags[key] = true);
		}
		if (command.args.length > 0) {
			commandOptions.commitMessage = command.args[0];
		}
		const includedFlags = Object.values(commandOptions.flags).filter((value) => value === true);
		if (includedFlags.length > 0) {
			if (commandOptions.flags.branch === true) {
				return await branch(commandOptions);
			} else {
				return await commit(commandOptions);
			}
		} else {
			return await main(commandOptions);
		}
	});

program.parse(process.argv);