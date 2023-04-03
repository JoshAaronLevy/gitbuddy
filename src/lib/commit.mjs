import { createSpinner } from "nanospinner";
import { red, yellow, green, white, bold, underline } from "colorette";
import enquirer from "enquirer";
import shell from "shelljs";
let remoteUrl = "";
let branchUrl = "";
let stageFlag = false;
let commitFlag = false;
let defaultMessage = "";
let message = "";
let unstagedFiles = [];
let stagedFiles = [];
let pushFlag = false;
let currentBranch = "";
let modifiedFiles = [];

export default async (commandOptions) => {
	try {
		if (commandOptions.all) stageFlag = true;
		if (commandOptions.push) pushFlag = true;
		if (commandOptions.commitMessage) {
			commitFlag = true;
			defaultMessage = commandOptions.commitMessage;
		}
		remoteUrl = await getOriginUrl();
		currentBranch = await identifyCurrentBranch();
		branchUrl = `${remoteUrl}/tree/${currentBranch}`;
		await checkStatus();
		process.exit(0);
	} catch (error) {
		console.log(error);
		return error;
	}
};

const getOriginUrl = async () => {
	try {
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
		return shell.exec("git rev-parse --abbrev-ref HEAD", { silent: true }).stdout;
	} catch (error) {
		console.log(error);
	}
};

const checkStatus = async () => {
	try {
		const spinner = createSpinner("Gathering file changes...").start();
		let untrackedFileList = [];
		let fileList = [];
		let untrackedIndex = 0;
		let modifiedLength = 0;
		let newLength = 0;
		let deletedLength = 0;
		let totalFilesChanged = 0;
		const p = shell.exec("git status", { silent: true });
		fileList = p.stdout.split("\n");
		for (let i = 0; i < fileList.length; i++) {
			fileList[i] = fileList[i].trim();
			if (fileList[i] === "Untracked files:") {
				untrackedIndex = i + 2;
			}
			if (fileList[i].includes("modified:")) {
				modifiedFiles.push(fileList[i].slice(12) + " " + yellow(bold("~")));
				modifiedLength++;
			}
			if (fileList[i].includes("deleted:")) {
				modifiedFiles.push(fileList[i].slice(12) + " " + red(bold("x")));
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
					modifiedFiles.push(untrackedFileList[i_2] + " " + green(bold("+")));
					newLength++;
				}
			}
		}
		totalFilesChanged = modifiedLength + newLength + deletedLength;
		if (totalFilesChanged === 1) {
			spinner.success({
				text: bold(`${totalFilesChanged} file change found\n`) +
					white("Modified: ") + yellow(`${modifiedLength}\n`) +
					white("New: ") + green(`${newLength}\n`) +
					white("Deleted: ") + red(`${deletedLength}`)
			});
			return fileSelection();
		} else if (totalFilesChanged > 1) {
			spinner.success({
				text: bold(`${totalFilesChanged} file changes found\n`) +
					white("Modified: ") + yellow(`${modifiedLength}\n`) +
					white("New: ") + green(`${newLength}\n`) +
					white("Deleted: ") + red(`${deletedLength}`)
			});
			return fileSelection();
		} else {
			return spinner.warn({
				text: yellow(bold("ALERT! ")) +
					white("No file changes found")
			});
		}
	} catch (error) {
		console.log(error);
	}
};

const fileSelection = async () => {
	try {
		if (stageFlag === true) {
			stagedFiles = ["-A"];
			return stagingCommand(stagedFiles);
		} else {
			return statusCheck
				.run()
				.then((answer) => {
					if (answer.length < 1) {
						return noFilesStaged();
					} else {
						return stagingCommand(answer);
					}
				})
				.catch((error) => {
					console.log(error);
					return noFilesStaged();
				});
		}
	} catch (error) {
		console.log(error);
	}
};

const stagingCommand = async (answer) => {
	const spinner = createSpinner("Staging files...").start();
	try {
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
		const shellAnswer = answer.join(" ");
		shell.exec(`git add ${shellAnswer}`, { silent: true });
		spinner.success({
			text: white(bold(`${successMsg}`))
		});
		return commitMessageInput();
	} catch (error) {
		return spinner.error({
			text: red(bold("ERROR! ") + white(`${error}`))
		});
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
					return invalidCommitMsg();
				}
			})
			.catch((error) => {
				return commitError(error);
			});
	}
};

const commitCommand = async (message) => {
	const spinner = createSpinner("Committing files...").start();
	try {
		let commitMessage = "";
		if (message.includes("'") || message.includes("\"")) {
			commitMessage = `${message.replace(/'/g, "\"\"")}`;
		} else {
			commitMessage = message;
		}
		const command = `git commit -m "${commitMessage}"`;
		const settings = { async: true, silent: true };
		return new Promise((resolve, reject) => {
			shell.exec(command, settings, (code) => handleExecResponse(code, command, settings, resolve, reject));
		}).then(() => {
			spinner.success({ text: white(bold(`'${message}' successfully committed`)) });
			return pushConfirm(message);
		}).catch((error) => {
			return spinner.error({
				text: red(bold("ERROR! ") + white(`${error}`))
			});
		});
	} catch (error) {
		console.log(error);
		return spinner.error({
			text: red(bold("ERROR! ") + white(`${error}`))
		});
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
				return abortPush();
			}
		});
	}
};

const gitPushStep = async (message) => {
	const spinner = createSpinner(`Pushing "${message}" to remote repository...`).start();
	try {
		const command = "git push";
		const settings = { async: true, silent: true };
		console.log("Pushing to remote repository...");
		return new Promise((resolve, reject) => {
			console.log("Pushing inside promise...");
			shell.exec(command, settings, (code) => handleExecResponse(code, command, settings, resolve, reject));
		}).then(() => {
			return spinner.success({
				text: white(bold("Code changes pushed\n")) +
					white(bold("View Repo: ")) + white(underline(`${remoteUrl}\n`)) +
					white(bold("View Branch: ")) + white(underline(`${branchUrl}`))
			});
		}).catch((error) => {
			console.log(error);
			return spinner.error({
				text: red(bold("ERROR! ") + white(`${error}`))
			});
		});
	} catch (p_1) {
		if (p_1.exitCode === 128) {
			spinner.warn({
				text: yellow(bold("ALERT! ")) +
					white(
						`${currentBranch} branch does not exist in remote repository. Attempting to create and push upstream...`
					)
			});
			return await gitPushUpstream(currentBranch);
		} else {
			spinner.error({
				text: red(bold("ERROR! ")) +
					white(
						"Could not push to remote repository. See details below:\n" +
						`${p_1.all}`
					)
			});
		}
	}
};

const gitPushUpstream = async (currentBranch) => {
	const spinner = createSpinner(`Setting ${currentBranch} upstream and pushing...`).start();
	try {
		const command = `git push --set-upstream origin ${currentBranch}`;
		const settings = { async: true, silent: true };
		console.log("Setting upstream...");
		return new Promise((resolve, reject) => {
			console.log("Setting upstream inside Promise...");
			shell.exec(command, settings, (code) => handleExecResponse(code, command, settings, resolve, reject));
		}).then(() => {
			return spinner.success({
				text: white(bold("Code changes pushed\n")) +
					white(bold("View Repo: ")) + white(underline(`${remoteUrl}\n`)) +
					white(bold("View Branch: ")) + white(underline(`${branchUrl}`))
			});
		}).catch((error) => {
			return spinner.error({
				text: red(bold("ERROR! ") + white(`${error}`))
			});
		});
	} catch (p_1) {
		return spinner.error({
			text: red(bold("ERROR!")) +
				white(
					" Could not push to remote repository via --set-upstream. See details below:\n" +
					`${p_1}`
				)
		});
	}
};

const handleExecResponse = (code, command, settings, resolve, reject) => {
	if (code === 0) {
		resolve({ code, command, settings, resolve, reject });
	} else {
		console.log("reject: ", reject[0]);
		reject({ code, command, settings, resolve, reject });
	}
};

const abortPush = () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("Changes not pushed to remote repository")
	});
};

const invalidCommitMsg = () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("Invalid commit message. Commit step aborted")
	});
};

const noFilesStaged = () => {
	const spinner = createSpinner().start();
	return spinner.warn({
		text: yellow(bold("ALERT! ")) + white("No files selected to stage")
	});
};

const commitError = (error) => {
	const spinner = createSpinner().start();
	return spinner.error({
		text: red(bold("ERROR! ")) + white(`${error}`)
	});
};

/* ------------------
GitBuddy Core prompts
------------------ */
const statusCheck = new enquirer.MultiSelect({
	type: "checkbox",
	name: "stageFiles",
	message: "1/3: Select the files you want to stage (Space to select)",
	choices: modifiedFiles
});

const commitMsg = new enquirer.Input({
	name: "commitInput",
	message: "2/3: Enter commit message"
});

const pushCheck = new enquirer.Select({
	name: "pushCheck",
	message: "3/3: Push to remote repository?",
	choices: ["Yes", "No"]
});
