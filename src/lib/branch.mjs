import { createSpinner } from "nanospinner";
import { red, yellow, green, white, bold } from "colorette";
import commit from "./commit.mjs";
import enquirer from "enquirer";
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
	commandArgs = commandOptions;
	try {
		remoteUrl = await getOriginUrl();
		currentBranch = await identifyCurrentBranch();
		allBranches = await identifyAllBranches();
		validBranches = await identifyValidBranches();
		invalidBranches = await identifyInvalidBranches();
		return await selectInitialCmd();
	} catch (error) {
		console.log(commandArgs);
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
		});
};

const checkGitStatus = async () => {
	const shell = await import("shelljs");
	const p = shell.exec("git status --porcelain", { silent: true }).stdout;
	const spinner = createSpinner().start();
	if (p.length > 0) {
		spinner.warn({
			text: yellow(bold("ALERT! ")) +
				white("You have uncommitted code changes")
		});
		return codeChangeSelect();
	} else {
		spinner.success({
			text: white("Current working directory is clean")
		});
		return inputBranchName();
	}
};

const codeChangeSelect = () => {
	return gitStatusSelect
		.run()
		.then((answer) => {
			if (answer === "Add, commit, and push changes to current branch first") {
				return runGitBuddyCore();
			}
			if (answer === "Continue without staging changes") {
				return inputBranchName();
			}
			else if (answer === "Stash changes") {
				return runStashCommand();
			}
			else if (answer === "Cancel") {
				return branchCreateAborted();
			}
		})
		.catch((error) => {
			return branchCreateError(error);
		});
};

const runGitBuddyCore = async () => {
	console.log("commandArgs: ", commandArgs);
	await commit(commandArgs);
	return inputBranchName();
};

const runStashCommand = async () => {
	const spinner = createSpinner("Stashing code changes...").start();
	const shell = await import("shelljs");
	shell.exec("git stash", { silent: true });
	spinner.success({
		text: white("Code changes stashed")
	});
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
	const spinner = createSpinner(`Validating branch name ${input}...`).start();
	if (invalidBranches.includes(input.toLowerCase())) {
		branchName = null;
		input = null;
		spinner.error({
			text: red(bold("ERROR! ")) +
				white(`Branch name ${input} already exists or invalid. Please enter a new branch name.`)
		});
	} else {
		spinner.success({
			text: "Branch name validated"
		});
		return createBranch(input);
	}
};

const createBranch = async (branchName) => {
	const spinner = createSpinner(`Creating and switching to branch: ${branchName}...`).start();
	const shell = await import("shelljs");
	try {
		shell.exec(`git checkout -b ${branchName}`, { silent: true });
		spinner.success({
			text: "Branch created locally. Now working on " + green(bold(`${branchName}`))
		});
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
	const spinner = createSpinner(`Setting ${branchName} upstream and pushing...`).start();
	const shell = await import("shelljs");
	try {
		shell.exec(`git push -u origin ${branchName}`, { silent: true });
		return spinner.success({
			text: white("Branch created in remote repository\n") +
				green(bold("Summary:\n")) +
				white(bold("Branch Name: ")) + white(`${currentBranch}\n`) +
				white(bold("Git Remote URL: ")) + white(`${remoteUrl}`)
		});
	} catch (p_1) {
		return spinner.error({
			text: red.bold("ERROR!") +
				white(
					" Could not push to remote repository via --set-upstream. See details below:\n" +
					`${p_1}`
				)
		});
	}
};

const selectBranches = async () => {
	const spinner = createSpinner().start();
	spinner.success({
		text: white(`Found ${validBranches.length} valid branches`)
	});
	return branchSelect
		.run()
		.then((answer) => {
			if (answer.length < 1) {
				return noBranchesSelected();
			} else {
				let branchConfirmMessage = "";
				if (answer.length === 1) {
					branchConfirmMessage = "Are you sure you want to delete the following branch?\n";
				} else if (answer.length > 1) {
					branchConfirmMessage = `Are you sure you want to delete the following ${answer.length} branches?\n`;
				} else {
					branchConfirmMessage = "Are you sure you want to delete the following branch(es)?\n";
				}
				const selectedBranchList = answer.join(",\n");
				spinner.warn({
					text: yellow(bold("ALERT! ")) + white(`${branchConfirmMessage}` + bold(`${selectedBranchList}`))
				});
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
	let branchDeletePending = "";
	let branchDeleteSuccess = "";
	if (deleteBranchList.length === 1) {
		branchDeletePending = `Deleting ${deleteBranchList.length} branch...`;
		branchDeleteSuccess = `${deleteBranchList.length} branch successfully deleted`;
	} else if (deleteBranchList.length > 1) {
		branchDeletePending = `Deleting ${deleteBranchList.length} branches...`;
		branchDeleteSuccess = `${deleteBranchList.length} branches successfully deleted`;
	} else {
		branchDeletePending = "Deleting branch(es)...";
		branchDeleteSuccess = "Branch(es) successfully deleted";
	}
	const spinner = createSpinner(`${branchDeletePending}`).start();
	try {
		for (const branch of deleteBranchList) {
			await deleteBranch(branch);
		}
		spinner.success({
			text: `${branchDeleteSuccess}`
		});
	} catch (error) {
		spinner.error({
			text: red(bold("ERROR! ")) + white(`Could not delete ${deleteBranchList}. Error: ${error}`)
		});
	}
};

const deleteBranch = async (branchName) => {
	const spinner = createSpinner(`Deleting branch: ${branchName}...`).start();
	const shell = await import("shelljs");
	try {
		shell.exec(`git branch -D ${branchName}`, { silent: true });
		spinner.success({
			text: `Branch ${branchName} deleted`
		});
	} catch (error) {
		return spinner.error({
			text: red(bold("ERROR! ")) + white(`Could not delete ${branchName}. Error: ${error}`)
		});
	}
};

const branchCreateError = async (error) => {
	const spinner = createSpinner().start();
	return spinner.error({
		text: red(bold("ERROR! ")) + white(`Could not create branch: ${error}`)
	});
};

const branchDeleteError = async (error) => {
	const spinner = createSpinner().start();
	return spinner.error({
		text: red(bold("ERROR! ")) + white(`Could not execute branch delete command: ${error}`)
	});
};

const branchCreateAborted = async () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("Branch creation aborted")
	});
};

const noBranchesSelected = async () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("No branches selected to delete")
	});
};

const noValidBranches = async () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("No valid branches found to delete")
	});
};

const branchDeleteAborted = async () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("Branch delete aborted")
	});
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
		// "Add, commit, and push changes to current branch first",
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
