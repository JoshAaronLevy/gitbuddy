#!/usr/bin/env node
"use strict";
const execa = require("execa");
const directory = process.cwd();
const { Input, Select, MultiSelect } = require("enquirer");
const ora = require("ora");
const chalk = require("chalk");
let spinner = null;
let remoteUrl = "";
let stageFlag = false;
let commitFlag = false;
let defaultMessage = "";
let message = "";
let unstagedFiles = [];
let stagedFiles = [];
let pushFlag = false;
let currentBranch = "";
let modifiedFiles = [];

module.exports = async (command) => {
	try {
		remoteUrl = await getRepoUrls();
		currentBranch = await identifyCurrentBranch();
	} catch (error) {
		return error;
	}
	if (command.A && command.A === true) {
		stageFlag = true;
	}
	if (command.args.length > 0) {
		commitFlag = true;
		defaultMessage = command.args[0];
	}
	if (command.push && command.push === true) {
		pushFlag = true;
	}
	try {
		await checkStatus();
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
	const p = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
		cwd: directory,
		all: true
	});
	return p.stdout;
};

const checkStatus = async () => {
	spinner = ora("Gathering file changes...").start();
	let untrackedFileList = [];
	let fileList = [];
	let untrackedIndex = 0;
	let modifiedLength = 0;
	let newLength = 0;
	let deletedLength = 0;
	let totalFilesChanged = 0;
	try {
		const p = await execa("git", ["status"], { cwd: directory });
		fileList = p.stdout.split("\n");
		for (let i = 0; i < fileList.length; i++) {
			fileList[i] = fileList[i].trim();
			if (fileList[i] === "Untracked files:") {
				untrackedIndex = i + 2;
			}
			if (fileList[i].includes("modified:")) {
				modifiedFiles.push(fileList[i].slice(12) + " " + chalk.yellow.bold("~"));
				modifiedLength++;
			}
			if (fileList[i].includes("deleted:")) {
				modifiedFiles.push(fileList[i].slice(12) + " " + chalk.red.bold("x"));
				deletedLength++;
			}
		}
		if (untrackedIndex > 0) {
			untrackedFileList = fileList.slice(
				untrackedIndex,
				fileList.length - 2
			);
			for (let i_2 = 0; i_2 < untrackedFileList.length; i_2++) {
				if (untrackedFileList[i_2] !== "") {
					unstagedFiles.push(untrackedFileList[i_2]);
					modifiedFiles.push(untrackedFileList[i_2] + " " + chalk.green.bold("+"));
					newLength++;
				}
			}
		}
		totalFilesChanged = modifiedLength + newLength + deletedLength;
		if (totalFilesChanged === 1) {
			spinner.succeed(
				chalk.bold(`${totalFilesChanged} file change found\n`) +
				chalk.white("Modified: ") + chalk.yellow.bold(`${modifiedLength}\n`) +
				chalk.white("New: ") + chalk.green.bold(`${newLength}\n`) +
				chalk.white("Deleted: ") + chalk.red.bold(`${deletedLength}`)
			);
			return fileSelection();
		} else if (totalFilesChanged > 1) {
			spinner.succeed(
				chalk.bold(`${totalFilesChanged} file changes found\n`) +
				chalk.white("Modified: ") + chalk.yellow.bold(`${modifiedLength}\n`) +
				chalk.white("New: ") + chalk.green.bold(`${newLength}\n`) +
				chalk.white("Deleted: ") + chalk.red.bold(`${deletedLength}`)
			);
			return fileSelection();
		} else {
			return spinner.warn(
				chalk.yellow.bold("ALERT! ") +
				chalk.white("No file changes found")
			);
		}
	} catch (err) {
		return spinner.warn(
			chalk.yellow.bold("ALERT! ") + chalk.white("Process aborted")
		);
	}
};

const fileSelection = () => {
	spinner = ora();
	if (stageFlag === true) {
		stagedFiles = ["-A"];
		return stagingCommand(stagedFiles);
	} else {
		return statusCheck
			.run()
			.then((answer) => {
				if (answer.length < 1) {
					return noFilesStaged(spinner);
				} else {
					return stagingCommand(answer);
				}
			})
			.catch((error) => {
				console.log(error);
				return noFilesStaged(spinner);
			});
	}
};

const stagingCommand = async (answer) => {
	for (let i = 0; i < answer.length; i++) {
		answer[i] = answer[i].slice(0, -21);
	}
	const fileCount = answer.length;
	let successMsg = "";
	if (fileCount === 1) {
		successMsg = "1 file staged";
	} else {
		successMsg = `${fileCount} files staged`;
	}
	spinner = ora("Staging files...").start();
	try {
		await execa("git", ["add", ...answer], { cwd: directory, all: true });
		spinner.succeed(
			chalk.white.bold(`${successMsg}`)
		);
		return commitMessageInput();
	} catch (error) {
		return spinner.fail(
			chalk.red.bold("ERROR! ") + chalk.white(`${error}`)
		);
	}
};

const commitMessageInput = () => {
	if (commitFlag === true) {
		message = defaultMessage;
		return commitCommand(message);
	} else {
		return commitMsg
			.run()
			.then((answer) => {
				message = answer;
				if (message.length > 0) {
					return commitCommand(message);
				} else {
					return invalidCommitMsg(spinner);
				}
			})
			.catch((error) => {
				console.log(error);
				return abortCommit(spinner);
			});
	}
};

const commitCommand = async (message) => {
	const commitMessage = `${message.replace(/'/g, "\"\"")}`;
	spinner = ora("Committing files...").start();
	try {
		await execa(
			"git",
			["commit", "-m", commitMessage],
			{
				cwd: directory,
				all: true
			}
		);
		spinner.succeed(
			chalk.white.bold(`'${message}' successfully committed`)
		);
		return pushConfirm(message);
	} catch (error) {
		return spinner.fail(
			chalk.red.bold("ERROR! ") + chalk.white(`${error}`)
		);
	}
};

const pushConfirm = (message) => {
	if (pushFlag === true) {
		return gitPushStep(message);
	} else {
		return pushCheck.run().then((answer) => {
			if (answer === "Yes") {
				return gitPushStep(message);
			} else {
				return abortPush(spinner);
			}
		});
	}
};

const gitPushStep = async (message) => {
	const spinner = ora(`Pushing "${message}" to remote repository...`).start();
	try {
		const p = await execa("git", ["push"], { cwd: directory, all: true });
		console.log("p.all", p.all);
		console.log("p.stdout", p.stdout);
		return spinner.succeed(
			chalk.white("Code changes pushed\n") +
			chalk.white.bold("View Repo: ") + chalk.white(`${remoteUrl}`) +
			chalk.white.bold("View Branch: ") + chalk.white(`${remoteUrl}/tree/${currentBranch}`)
		);
	} catch (p_1) {
		if (p_1.exitCode === 128) {
			spinner.warn(
				chalk.yellow.bold("ALERT! ") +
				chalk.white(
					`${currentBranch} branch does not exist in remote repository. Attempting to create and push upstream...`
				)
			);
			return await gitPushUpstream(currentBranch);
		} else {
			spinner.fail(
				chalk.red.bold("ERROR! ") +
				chalk.white(
					"Could not push to remote repository. See details below:\n" +
					`${p_1.all}`
				)
			);
		}
	}
};

const gitPushUpstream = async (currentBranch) => {
	spinner = ora(
		`Setting ${currentBranch} upstream and pushing...`
	).start();
	try {
		await execa(
			"git",
			["push", "-u", "origin", `${currentBranch}`],
			{
				cwd: directory,
				all: true
			}
		);
		return spinner.succeed(
			chalk.white("Code changes pushed\n") +
			chalk.white.bold("View Repo: ") + chalk.white(`${remoteUrl}`) +
			chalk.white.bold("View Branch: ") + chalk.white(`${remoteUrl}/tree/${currentBranch}`)
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

const abortPush = (spinner) => {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") +
		chalk.white("Changes not pushed to remote repository")
	);
};

const abortCommit = (spinner) => {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") + chalk.white("Commit step aborted")
	);
};

const invalidCommitMsg = (spinner) => {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") +
		chalk.white("Invalid commit message. Commit step aborted")
	);
};

const noFilesStaged = (spinner) => {
	spinner.warn(
		chalk.yellow.bold("ALERT! ") + chalk.white("No files selected to stage")
	);
};

/* ------------------
GitBuddy Core prompts
------------------ */
const statusCheck = new MultiSelect({
	type: "checkbox",
	name: "stageFiles",
	message: "1/3: Select the files you want to stage (Space to select)",
	choices: modifiedFiles
});

const commitMsg = new Input({
	name: "commitInput",
	message: "2/3: Enter commit message"
});

const pushCheck = new Select({
	name: "pushCheck",
	message: "3/3: Push to remote repository?",
	choices: ["Yes", "No"]
});
