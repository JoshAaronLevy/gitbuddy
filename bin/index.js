#!/usr/bin/env node
const program = require("commander");
const main = require("../lib/main.js");
const cleanup = require("../lib/cleanup.js");
const branch = require("../lib/branch.js");

program
	.description("Example: gitbuddy \"I fixed a bug\"")
	.option("[message]", "Commit message")
	.option("-A, -a, --all", "Stage all files")
	.option("-p, --push", "Automatically push to remote repository")
	.option("b, branch", "Create new branch")
	.option("c, cleanup", "Clean up branches")
	.version("4.0.2", "-v, --version")
	.action(async (message, command) => {
		console.log("message: ", message);
		console.log("command: ", command);
		if (message.cleanup === true || message.c === true) {
			command = message;
			await cleanup(command);
		} else if (message.branch === true || message.b === true) {
			command = message;
			await branch(command);
		} else if (!command || command === undefined) {
			command = message;
			await main(command);
		} else {
			await main(command);
		}
	});

program.parse(process.argv);
