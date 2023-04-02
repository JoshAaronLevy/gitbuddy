import { Command } from "commander";
const program = new Command();
import main from "../lib/main.js";
import branch from "../lib/branch.js";

program.description("Example: gitbuddy \"I fixed a bug\"")
	.option("[message]", "Commit message")
	.option("-A, -a, --all", "Stage all files")
	.option("-p, --push", "Automatically push to remote repository")
	.option("-b, --branch", "Manage branches")
	.version("5.0.0", "-v, --version")
	.action(async (message, command) => {
		if (message.branch === true || message.b === true) {
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
