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
let trackedStartIndex = 0;
let trackedEndIndex = 0;
let untrackedIndex = 0;
let untrackedFileList = [];
let trackedFileList = [];
let unstagedFiles = [];
let stagedFiles = [];
let pushFlag = false;
let currentBranch = "";
let fileList;

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
		return await getUnstagedFiles();
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

const getUnstagedFiles = async () => {
	const spinner = ora("Gathering file changes...").start();
	fileList = [];
	try {
		let stageMessage = "";
		const p = await execa("git", ["status"], { cwd: directory });
		fileList = p.stdout.split("\n");
		let filteredList = fileList.filter(file => file.includes("\t")).map(file => {
			if (file.includes("modified:")) {
				return file.slice(12).trim();
			} else {
				return file.slice(1).trim();
			}
		});
		unstagedFiles = filteredList.filter((item, index) => filteredList.indexOf(item) === index);
		if (unstagedFiles.length === 0) return spinner.warn(chalk.yellow.bold("ALERT! ") + chalk.white("No file change(s) found"));
		if (unstagedFiles.length > 0) {
			if (unstagedFiles.length === 1) stageMessage = `${unstagedFiles.length} file`;
			if (unstagedFiles.length > 1) stageMessage = `${unstagedFiles.length} files`;
			spinner.succeed(chalk.white(`${stageMessage}`));
			return fileSelection();
		}
	} catch (e) {
		return spinner.warn(
			chalk.yellow.bold("ALERT! ") + chalk.white("Process aborted")
		);
	}
};

const checkStatus = async () => {
	spinner = ora("Gathering file changes...").start();
	untrackedFileList = [];
	trackedFileList = [];
	fileList = [];
	trackedStartIndex = 0;
	trackedEndIndex = 0;
	untrackedIndex = 0;
	try {
		const p = await execa("git", ["status"], { cwd: directory });
		fileList = p.stdout.split("\n");
		console.log("fileList: ", fileList);
		for (let i = 0; i < fileList.length; i++) {
			fileList[i] = fileList[i].trim();
			if (fileList[i] === "Changes not staged for commit:") {
				trackedStartIndex = i + 3;
				trackedEndIndex = fileList.length - 2;
			}
			if (fileList[i] === "Untracked files:") {
				untrackedIndex = i + 2;
				trackedEndIndex = i - 1;
			}
		}
		if (trackedStartIndex > 0) {
			trackedFileList = fileList.slice(
				trackedStartIndex,
				trackedEndIndex
			);
			for (let i_1 = 0; i_1 < trackedFileList.length; i_1++) {
				if (trackedFileList[i_1] !== "") {
					unstagedFiles.push(trackedFileList[i_1].slice(12));
				}
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
				}
			}
		}
		if (unstagedFiles.length === 1) {
			spinner.succeed(
				chalk.bold(`${unstagedFiles.length} file change found`)
			);
			return fileSelection();
		} else if (unstagedFiles.length > 1) {
			spinner.succeed(
				chalk.bold(`${unstagedFiles.length} file changes found`)
			);
			return fileSelection();
		} else {
			return spinner.warn(
				chalk.yellow.bold("ALERT! ") +
				chalk.white("No file change(s) found")
			);
		}
	} catch (e) {
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
	const fileCount = answer.length;
	const successMsg = `${fileCount} file(s) staged`;
	spinner = ora("Staging files...").start();
	try {
		await execa("git", ["add", ...answer], { cwd: directory, all: true });
		spinner.succeed(
			chalk.green.bold("SUCCESS! ") + chalk.white(`${successMsg}`)
		);
		return commitMessageInput();
	} catch (error) {
		return spinner.fail(
			chalk.red.bold("ERROR! ") + chalk.white(`${error}`)
		);
	}
};

const commitMessageInput = (fileCount) => {
	if (commitFlag === true) {
		message = defaultMessage;
		return commitCommand(message);
	} else {
		return commitMsg
			.run()
			.then((answer) => {
				message = answer;
				if (message.length > 0) {
					return commitCommand(message, fileCount);
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

const commitCommand = async (message, fileCount) => {
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
			chalk.green.bold("SUCCESS! ") +
			chalk.white(`'${message}' successfully committed`)
		);
		return pushConfirm(message, fileCount);
	} catch (error) {
		return spinner.fail(
			chalk.red.bold("ERROR! ") + chalk.white(`${error}`)
		);
	}
};

const pushConfirm = (message, fileCount) => {
	if (pushFlag === true) {
		return gitPushStep(message, fileCount);
	} else {
		return pushCheck.run().then((answer) => {
			if (answer === "Yes") {
				return gitPushStep(message, fileCount);
			} else {
				return abortPush(spinner);
			}
		});
	}
};

const gitPushStep = async (message, fileCount) => {
	const spinner = ora(`Pushing "${message}" to remote repository...`).start();
	try {
		await execa("git", ["push"], { cwd: directory, all: true });
		return spinner.succeed(
			chalk.green.bold("SUCCESS! ") + chalk.white(`${fileCount} file changes pushed\n`) +
			chalk.blue.bold("Summary:\n") +
			chalk.yellow.bold("Commit Message: ") + chalk.white(`'${message}'\n`) +
			chalk.yellow.bold("Branch Name: ") + chalk.white(`${currentBranch}\n`) +
			chalk.yellow.bold("Git Remote URL: ") + chalk.white(`${remoteUrl}`)
		);
	} catch (p_1) {
		if (p_1.exitCode === 128) {
			spinner.warn(
				chalk.yellow.bold("ALERT! ") +
				chalk.white(
					`${currentBranch} branch does not exist in remote repository yet.`
				)
			);
			return await gitPushUpstream(currentBranch, message, fileCount);
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

const gitPushUpstream = async (currentBranch, message, fileCount) => {
	spinner = ora(
		`Attempting to set ${currentBranch} as upstream and push...`
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
			chalk.green.bold("SUCCESS! ") + chalk.white(`${fileCount} file changes pushed\n`) +
			chalk.blue.bold("Summary:\n") +
			chalk.yellow.bold("Commit Message: ") + chalk.white(`'${message}'\n`) +
			chalk.yellow.bold("Branch Name: ") + chalk.white(`${currentBranch}\n`) +
			chalk.yellow.bold("Git Remote URL: ") + chalk.white(`${remoteUrl}`)
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
	choices: unstagedFiles
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
