import commit from "./commit.js";
import enquirer from "enquirer";
import { red, yellow, white, bold } from "colorette";
let spinner = null;
let allBranches = [];
let validBranches = [];
let invalidBranches = [];
let defaultInvalidBranches = [
	"master",
	"main",
	"dev",
	"develop",
	"development",
	"qa",
	"stage",
	"staging",
	"prod",
	"production",
	""
];
let currentBranch = "";
let branchName = "";
let remoteUrl = "";
let commandArgs;

export default async (commandOptions) => {
	try {
		commandArgs = commandOptions;
		remoteUrl = await getOriginUrl();
		currentBranch = await identifyCurrentBranch();
		allBranches = await identifyAllBranches();
		validBranches = await identifyValidBranches();
		invalidBranches = await identifyInvalidBranches();
		return await selectInitialCmd();
	} catch (error) {
		console.error(error);
	}
	process.exit(0);
};

const getOriginUrl = async () => {
	try {
		const shell = await import("shelljs");
		const p = shell.exec("git remote -v", { silent: true }).stdout;
		const remoteUrlList = [p][0].split("\n").filter(url => url.includes("origin"));
		return identifyOriginUrl(remoteUrlList[0]);
	} catch (error) {
		console.log(error);
	}
};

const identifyOriginUrl = (rawRemoteUrl) => {
	if (rawRemoteUrl.includes("https")) {
		return rawRemoteUrl.substring(6, rawRemoteUrl.length - 12).trim();
	} else if (rawRemoteUrl.includes("github")) {
		return `https://github.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
	} else if (rawRemoteUrl.includes("gitlab")) {
		return `https://gitlab.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
	} else {
		return rawRemoteUrl;
	}
};

const identifyCurrentBranch = async () => {
	try {
		const shell = await import("shelljs");
		const branchResult = shell.exec("git rev-parse --abbrev-ref HEAD", { silent: true }).stdout;
		return branchResult.trim();
	} catch (error) {
		console.log(error);
	}
};

const identifyAllBranches = async () => {
	const shell = await import("shelljs");
	const p = shell.exec("git branch -l", { silent: true });
	const tempBranchList = p.stdout.split("\n");
	return tempBranchList.map(branch => branch.trim());
};

const identifyValidBranches = async () => {
	allBranches.forEach(branch => {
		if (
			!branch.includes("*") &&
			branch !== "master" &&
			branch !== "main" &&
			branch !== currentBranch &&
			branch !== "dev" &&
			branch !== "develop" &&
			branch !== "development" &&
			branch !== "qa" &&
			branch !== "stage" &&
			branch !== "staging" &&
			branch !== "production" &&
			branch !== "prod" &&
			branch !== ""
		) {
			validBranches.push(branch);
		}
	});
	return validBranches;
};

const identifyInvalidBranches = async () => {
	allBranches.forEach(branch => {
		if (branch.includes("*")) {
			invalidBranches.push(branch);
		}
	});
	invalidBranches.push(currentBranch, ...defaultInvalidBranches);
	return invalidBranches;
};

const selectInitialCmd = async () => {
	return branchInit
		.run()
		.then((answer) => {
			if (answer === "Create local and remote branch") {
				return checkGitStatus();
			} else if (answer === "Delete local branches" && validBranches.length > 0) {
				return selectBranches();
			} else if (answer === "Delete local branches" && validBranches.length === 0) {
				return noValidBranches();
			} else {
				return branchCreateAborted();
			}
		})
		.catch((error) => {
			console.log(error);
			// return branchCreateError(error);
		});
};

const checkGitStatus = async () => {
	const { ora } = await import("ora");
	const shell = await import("shelljs");
	const p = shell.exec("git status --porcelain", { silent: true }).stdout;
	// const { execa } = await import("execa");
	const { chalk } = await import("chalk");
	spinner = ora("Checking for code changes...").start();
	// const p = await execa("git", ["status", "--porcelain"], {
	// 	cwd: directory,
	// 	all: true
	// });
	if (p.length > 0) {
		spinner.warn(
			chalk.yellow.bold("ALERT! ") +
			chalk.white("You have uncommitted code changes")
		);
		return codeChangeSelect();
	} else {
		spinner.succeed(chalk.white("Current working directory is clean"));
		return inputBranchName();
	}
};

const codeChangeSelect = () => {
	return gitStatusSelect
		.run()
		.then((answer) => {
			if (answer === "Add, commit, and push changes to current branch first") {
				return runGitBuddyCore(commandArgs);
			} else if (answer === "Continue without staging changes") {
				return inputBranchName();
			} else if (answer === "Stash changes") {
				return runStashCommand();
			} else if (answer === "Cancel") {
				return branchCreateAborted();
			}
		})
		.catch((error) => {
			return branchCreateError(error);
		});
};

const runGitBuddyCore = async () => {
	await commit(commandOptions);
	return inputBranchName();
};

const runStashCommand = async () => {
	const { ora } = await import("ora");
	const shell = await import("shelljs");
	shell.exec("git stash", { silent: true });
	// const { execa } = await import("execa");
	const { chalk } = await import("chalk");
	spinner = ora("Stashing code changes...").start();
	// await execa("git", ["stash"], {
	// 	cwd: directory,
	// 	all: true
	// });
	spinner.succeed(chalk.white("Code changes stashed"));
	return inputBranchName();
};

const inputBranchName = () => {
	return branchCreate
		.run()
		.then((message) => {
			if (message.length > 0) {
				branchName = message;
				return validateNewBranchName(branchName);
			} else {
				return branchCreateAborted();
			}
		})
		.catch((error) => {
			return branchCreateError(error);
		});
};

const validateNewBranchName = async (input) => {
	const { ora } = await import("ora");
	const { chalk } = await import("chalk");
	spinner = ora(
		`Validating branch name ${input}...`
	).start();
	if (invalidBranches.includes(input.toLowerCase())) {
		branchName = null;
		input = null;
		spinner.fail(
			chalk.red.bold("ERROR! ") +
			chalk.white(
				`Branch name ${input} already exists or invalid. Please enter a new branch name.`
			)
		);
	} else {
		spinner.succeed("Branch name validated");
		return createBranch(input);
	}
};

const createBranch = async (branchName) => {
	const { ora } = await import("ora");
	const shell = await import("shelljs");
	// const { execa } = await import("execa");
	const { chalk } = await import("chalk");
	spinner = ora(
		`Creating and switching to branch: ${branchName}...`
	).start();
	try {
		shell.exec(`git checkout -b ${branchName}`, { silent: true });
		// await execa("git", ["checkout", "-b", `${branchName}`], {
		// 	cwd: directory,
		// 	all: true,
		// });
		spinner.succeed("Branch created locally. Now working on " + chalk.green.bold(`${branchName}`));
		return gitPushCheck(branchName);
	} catch (error) {
		return branchCreateError(error.stderr);
	}
};

const gitPushCheck = (branchName) => {
	return pushConfirm
		.run()
		.then((answer) => {
			if (answer === "Yes") {
				return gitPushUpstream(branchName);
			} else {
				return answer;
			}
		})
		.catch((error) => {
			return error;
		});
};

const gitPushUpstream = async (branchName) => {
	const { ora } = await import("ora");
	const shell = await import("shelljs");
	// const { execa } = await import("execa");
	const { chalk } = await import("chalk");
	spinner = ora(
		`Setting ${branchName} upstream and pushing...`
	).start();
	try {
		shell.exec(`git push -u origin ${branchName}`, { silent: true });
		// await execa("git", ["push", "-u", "origin", `${branchName}`], {
		// 	cwd: directory,
		// 	all: true,
		// });
		return spinner.succeed(
			chalk.white("Branch created in remote repository\n") +
			chalk.green.bold("Summary:\n") +
			chalk.white.bold("Branch Name: ") + chalk.white(`${currentBranch}\n`) +
			chalk.white.bold("Git Remote URL: ") + chalk.white(`${remoteUrl}`)
		);
	} catch (p_1) {
		spinner.fail(
			chalk.red.bold("ERROR!") +
			chalk.white(
				" Could not push to remote repository via --set-upstream. See details below:\n" +
				`${p_1}`
			)
		);
	}
};

const selectBranches = async () => {
	const { ora } = await import("ora");
	return branchSelect
		.run()
		.then((answer) => {
			spinner = ora("Checking selected branches...").start();
			if (answer.length < 1) {
				return noBranchesSelected();
			} else {
				spinner.warn(yellow(bold("ALERT! ")) + white(`Are you sure you want to delete the following branch(es)?\n${answer}`));
				return confirmBranchDelete(answer);
			}
		})
		.catch((error) => {
			console.log(error);
			// return branchDeleteError(error);
		});
};

const confirmBranchDelete = (selectedBranches) => {
	return deleteBranchConfirm
		.run()
		.then((answer) => {
			if (answer === "Yes") {
				return deleteSelectedBranches(selectedBranches);
			} else {
				return branchDeleteAborted();
			}
		})
		.catch((error) => {
			return branchDeleteError(error);
		});
};

const deleteSelectedBranches = async (deleteBranchList) => {
	const { ora } = await import("ora");
	spinner = ora(
		"Deleting branch(es)..."
	).start();
	try {
		for (const branch of deleteBranchList) {
			await deleteBranch(branch);
		}
		spinner.succeed("Branch(es) successfully deleted");
	} catch (error) {
		spinner.fail(
			red(bold("ERROR! ")) +
			white(
				`Could not delete ${deleteBranchList}. Error: ${error}`
			)
		);
	}
};

const deleteBranch = async (branchName) => {
	const { ora } = await import("ora");
	const shell = await import("shelljs");
	// const { execa } = await import("execa");
	spinner = ora(
		`Deleting branch: ${branchName}...`
	).start();
	try {
		shell.exec(`git branch -D ${branchName}`, { silent: true });
		// await execa("git", ["branch", "-D", `${branchName}`]);
		spinner.succeed(`Branch ${branchName} deleted`);
	} catch (error) {
		spinner.fail(
			red(bold("ERROR! ")) +
			white(
				`Could not delete ${branchName}. Error: ${error}`
			)
		);
	}
};

const branchCreateError = async (error) => {
	// const { ora } = await import("ora");
	console.log(
		red(bold("ERROR! ")) +
		white(
			`Could not create branch: ${error}`
		)
	);
	return error;
	// spinner = ora().start();
	// return spinner.fail(
	// 	chalk.red.bold("ERROR! ") +
	// 	chalk.white(
	// 		`Could not create branch: ${error}`
	// 	)
	// );
}

const branchDeleteError = async (error) => {
	// const { ora } = await import("ora");
	console.log(
		red(bold("ERROR! ")) +
		white(
			`Could not execute branch delete command: ${error}`
		)
	);
	return error;
	// spinner = ora().start();
	// return spinner.fail(
	// 	chalk.red.bold("ERROR! ") +
	// 	chalk.white(
	// 		`Could not execute branch delete command: ${error}`
	// 	)
	// );
}

const branchCreateAborted = async () => {
	// const { ora } = await import("ora");
	console.log(
		yellow(bold("ALERT! ")) + white("Branch creation aborted")
	);
	return error;
	// spinner = ora().start();
	// return spinner.warn(
	// 	chalk.yellow.bold("ALERT! ") +
	// 	chalk.white(
	// 		"Branch creation aborted"
	// 	)
	// );
}

const noBranchesSelected = async () => {
	// const { ora } = await import("ora");
	console.log(
		yellow(bold("ALERT! ")) + white("No branches selected to delete")
	);
	return error;
	// spinner = ora().start();
	// return spinner.warn(
	// 	chalk.yellow.bold("ALERT! ") + chalk.white("No branches selected to delete")
	// );
};

const noValidBranches = async () => {
	// const { ora } = await import("ora");
	console.log(
		yellow(bold("\nALERT! ")) + white("No valid branches found to delete\n")
	);
	// spinner = ora().start();
	// return spinner.warn(
	// 	chalk.yellow.bold("ALERT! ") + chalk.white("No valid branches found to delete\n")
	// );
};

const branchDeleteAborted = async () => {
	// const { ora } = await import("ora");
	console.log(
		yellow(bold("ALERT! ")) + white("Branch delete aborted")
	);
	return error;
	// spinner = ora().start();
	// return spinner.warn(
	// 	chalk.yellow.bold("ALERT! ") + chalk.white("Branch delete aborted")
	// );
};

/* --------------------
GitBuddy Branch prompts
-------------------- */
const branchInit = new enquirer.Select({
	name: "branchInit",
	message: "What would you like to do?",
	choices: ["Delete local branches", "Create local and remote branch"]
});

const branchCreate = new enquirer.Input({
	name: "branchInput",
	message: "Enter branch name"
});

const gitStatusSelect = new enquirer.Select({
	name: "gitStatusSelect",
	message: "What would you like to do?",
	choices: [
		"Add, commit, and push changes to current branch first",
		"Continue without staging changes",
		"Stash changes",
		"Cancel"
	]
});

const deleteBranchConfirm = new enquirer.Select({
	name: "deleteBranchConfirm",
	message: "NOTE: This cannot be undone.",
	choices: ["Yes", "No"]
});

const pushConfirm = new enquirer.Select({
	name: "pushConfirm",
	message: "Would you like to create the branch in your remote repository now?",
	choices: ["Yes", "No"]
});

const branchSelect = new enquirer.MultiSelect({
	type: "checkbox",
	name: "branchSelect",
	message: "Select the branch(es) you want to delete (Space to select)",
	choices: validBranches
});
