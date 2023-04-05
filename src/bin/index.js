#!/usr/bin/env node
const program = require("commander");
const main = require("../lib/main");
const commit = require("../lib/commit");
const branch = require("../lib/branch");

let commandOptions = {
	flags: {
		all: false,
		push: false,
		commit: false,
		branch: false
	},
	commitMessage: null
};

program
	.description("Example: gitbuddy \"I fixed a bug\"")
	.option("[message]", "Commit message")
	.option("-A, -a, --all", "Stage all files")
	.option("-p, --push", "Automatically push to remote repository")
	.option("-b, --branch", "Manage branches")
	.option("-c, --commit", "Commit prompts")
	.version("5.2.11", "-v, --version")
	.action(async (message, command) => {
		try {
			if (command) {
				if (Object.keys(command._optionValues).length > 0) {
					Object.keys(command._optionValues).map((key) => commandOptions.flags[key] = true);
				}
				if (command.args.length > 0) {
					commandOptions.commitMessage = command.args[0];
				}
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
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);