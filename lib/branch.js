#!/usr/bin/env node
/* eslint-disable no-unused-vars */
"use strict";
const execa = require("execa");
const directory = process.cwd();
const { Input, Select, MultiSelect } = require("enquirer");
const ora = require("ora");
const chalk = require("chalk");
let spinner = null;
let allBranches = [];
let validBranches = [];
let invalidBranches = [
	"master",
	"main",
	"dev",
	"develop",
	"development",
	"qa",
	"stage",
	"staging",
	"prod",
	"production"
];
let defaultError = "Unknown Error";
let currentBranch = "";
let branchName = "";
let remoteUrl = "";

module.exports = async () => {
	try {
		await getRepoUrls();
		await identifyCurrentBranch();
		await identifyAllBranches();
		await identifyValidBranches();
		await identifyInvalidBranches();
	} catch (error) {
		return error;
	}
	try {
		await selectInitialCmd();
	} catch (error) {
		console.error(error);
	}
	process.exit(0);
};

const getRepoUrls = async () => {
	try {
		const p = await execa("git", ["remote", "-v"], { cwd: directory, all: true });
		const remoteUrlList = [p.all][0].split("\n").filter(url => url.includes("origin"));
		return await identifyOriginUrl(remoteUrlList[0]);
	} catch (error) {
		console.log(chalk.yellow.bold("WARNING! ") + chalk.white("Unable to identify git remote URL\n") + chalk.red.bold(error));
	}
};

const identifyOriginUrl = async (rawRemoteUrl) => {
	if (rawRemoteUrl.includes("https")) {
		remoteUrl = rawRemoteUrl.substring(6, rawRemoteUrl.length - 12).trim();
	} else if (rawRemoteUrl.includes("github")) {
		remoteUrl = `https://github.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
	} else if (rawRemoteUrl.includes("gitlab")) {
		remoteUrl = `https://gitlab.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
	} else {
		remoteUrl = rawRemoteUrl;
	}
	return remoteUrl;
};

const identifyCurrentBranch = async () => {
	const p = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
		cwd: directory,
		all: true
	});
	currentBranch = p.stdout;
	return currentBranch;
};

const identifyAllBranches = async () => {
	const p = await execa("git", ["branch", "-l"], {
		cwd: directory,
		all: true
	});
	const tempBranchList = p.stdout.split("\n");
	allBranches = tempBranchList.map(branch => branch.trim());
	return p.stdout;
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
			branch !== "prod"
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
	invalidBranches.push(currentBranch);
	return invalidBranches;
};

const selectInitialCmd = async function () {
	return branchInit
		.run()
		.then((answer) => {
			if (answer === "Create local and remote branch") {
				return checkGitStatus();
				// return inputBranchName();
			} else if (answer === "Delete local branches") {
				return selectBranches();
			} else {
				return branchCreateAborted(spinner, defaultError);
			}
		})
		.catch((error) => {
			return branchCreateError(spinner, error);
		});
};

const checkGitStatus = async function () {
	const p = await execa("git", ["status", "--porcelain"], {
		cwd: directory,
		all: true
	});
	console.log("git status", p.stdout);
	if (p.stdout.length > 0) {
		return true;
	} else {
		return false;
	}
};

const inputBranchName = function () {
	return branchCreate
		.run()
		.then((message) => {
			if (message.length > 0) {
				branchName = message;
				return validateNewBranchName(branchName);
			} else {
				return branchCreateAborted(spinner, defaultError);
			}
		})
		.catch((error) => {
			return branchCreateError(spinner, error);
		});
};

const validateNewBranchName = function (input) {
	spinner = ora(
		`Validating branch name ${input}...`
	).start();
	if (invalidBranches.includes(input)) {
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

const createBranch = async function (branchName) {
	spinner = ora(
		`Creating and switching to branch: ${branchName}...`
	).start();
	try {
		await execa("git", ["checkout", "-b", `${branchName}`], {
			cwd: directory,
			all: true,
		});
		spinner.succeed("Branch created locally. Now working on " + chalk.green.bold(`${branchName}`));
		return gitPushUpstream(branchName);
	} catch (error) {
		return branchCreateError(spinner, error.stderr);
	}
};

const gitPushUpstream = async function (branchName) {
	spinner = ora(
		`Setting ${branchName} upstream and pushing...`
	).start();
	try {
		await execa("git", ["push", "-u", "origin", `${branchName}`], {
			cwd: directory,
			all: true,
		});
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

const selectBranches = () => {
	spinner = ora();
	return branchSelect
		.run()
		.then((answer) => {
			if (answer.length < 1) {
				return noBranchesSelected(spinner);
			} else {
				return deleteSelectedBranches(answer);
			}
		})
		.catch((error) => {
			return noBranchesSelected(spinner);
		});
};

const deleteSelectedBranches = async function (deleteBranchList) {
	spinner = ora(
		"Deleting branch(es)..."
	).start();
	try {
		for (let i = 0; i < deleteBranchList.length; i++) {
			await deleteBranch(deleteBranchList[i]);
		}
		spinner.succeed("Branch(es) successfully deleted");
	} catch (error) {
		spinner.fail(
			chalk.red.bold("ERROR! ") +
			chalk.white(
				`Could not delete ${deleteBranchList}. Error: ${error}`
			)
		);
	}
};

const deleteBranch = async function (branchName) {
	spinner = ora(
		`Deleting branch: ${branchName}...`
	).start();
	try {
		const p = await execa("git", ["branch", "-D", `${branchName}`]);
		spinner.succeed(`Branch ${branchName} deleted`);
	} catch (error) {
		spinner.fail(
			chalk.red.bold("ERROR! ") +
			chalk.white(
				`Could not delete ${branchName}. Error: ${error}`
			)
		);
	}
};

// Thrown when the process throws an error
function branchCreateError(spinner, error) {
	spinner.fail(
		chalk.red.bold("ERROR! ") +
		chalk.white(
			`Could not create branch: ${error}`
		)
	);
}

// Thrown when the process is aborted
function branchCreateAborted(spinner, error) {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") +
		chalk.white(
			`Could not create branch: ${error}`
		)
	);
}

const noBranchesSelected = (spinner) => {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") + chalk.white("No branches selected to delete")
	);
};

// Thrown when the process throws an error
function gitBuddyError(spinner, error) {
	spinner = ora().start();
	spinner.fail(
		chalk.red.bold("ERROR! ") +
		chalk.white(
			"Run \"gitbuddy\" to add, commit, and push your changes"
		)
	);
}

/* --------------------
GitBuddy Branch prompts
-------------------- */
const branchInit = new Select({
	name: "branchInit",
	message: "What would you like to do?",
	choices: ["Delete local branches", "Create local and remote branch"]
});

const branchCreate = new Input({
	name: "branchInput",
	message: "Enter branch name"
});

const commitCheck = new Select({
	name: "commitCheck",
	message: "Would you like to add, commit, and push your changes?",
	choices: ["Yes", "No"]
});

const branchSelect = new MultiSelect({
	type: "checkbox",
	name: "branchSelect",
	message: "Select the branch(es) you want to delete (Space to select)",
	choices: validBranches
});
