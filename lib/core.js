#!/usr/bin/env node
"use strict";
const execa = require("execa");
const directory = process.cwd();
const { Input, Select, MultiSelect } = require("enquirer");
const ora = require("ora");
const chalk = require("chalk");
let spinner = null;
let httpsUrl = ``;
let sshUrl = ``;
let gitHubUrl = ``;
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
        const p = await execa("git", ["remote", "-v"], {
            cwd: directory,
            all: true
        });
        if (p.all.match(/\bgit@github.com?:\S+/gi) != null) {
            sshUrl = p.all.match(/\bgit@github.com?:\S+/gi)[0];
            gitHubUrl = sshUrl.substring(0, sshUrl.length - 4);
        } else if (p.all.match(/\bhttps?:\/\/\S+/gi) != null) {
            httpsUrl = p.all.match(/\bhttps?:\/\/\S+/gi)[0];
            gitHubUrl = httpsUrl.substring(0, httpsUrl.length - 4);
        } else if (p.all.match(/\bgit@ssh.dev.azure.com?:\S+/gi) != null) {
            sshUrl = p.all.match(/\bgit@ssh.dev.azure.com?:\S+/gi)[0];
            gitHubUrl = sshUrl.substring(0, sshUrl.length);
        }
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
        await identifyCurrentBranch();
        await checkStatus();
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
};

// Find changed files
const checkStatus = async function () {
    spinner = ora(`Gathering file changes...`).start();
    untrackedFileList = [];
    trackedFileList = [];
    fileList = [];
    trackedStartIndex = 0;
    trackedEndIndex = 0;
    untrackedIndex = 0;
    try {
        const p = await execa("git", ["status"], { cwd: directory });
        fileList = p.stdout.split("\n");
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
            return fileSelection(unstagedFiles);
        } else if (unstagedFiles.length > 1) {
            spinner.succeed(
                chalk.bold(`${unstagedFiles.length} file changes found`)
            );
            return fileSelection(unstagedFiles);
        } else {
            return spinner.warn(
                chalk.yellow.bold(`ALERT! `) +
                chalk.white(`No file change(s) found`)
            );
        }
    } catch (e) {
        return spinner.warn(
            chalk.yellow.bold(`ALERT! `) + chalk.white(`Process aborted`)
        );
    }
};

// Select from list of unstaged files
const fileSelection = function (unstagedFiles) {
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
                return noFilesStaged(spinner);
            });
    }
};

// Runs command to stage selected files
const stagingCommand = async function (answer) {
    let successMsg = "";
    let fileCount = 0;
    if (answer.length === 1) {
        successMsg = `1 file staged`;
    } else {
        successMsg = `${answer.length} files staged`;
    }
    // if (answer[0] === `Add All Files`) {
    //   fileCount = (answer.length - 1);
    //   successMsg = `${fileCount} files staged`;
    //   answer.length = 0;
    //   answer = ['-A'];
    // } else {
    //   if (answer.length === 1) {
    //     successMsg = `1 file staged`;
    //   } else {
    //     successMsg = `${answer.length} files staged`;
    //   }
    // }
    spinner = ora(`Staging files...`).start();
    try {
        await execa("git", ["add", ...answer], { cwd: directory, all: true });
        spinner.succeed(
            chalk.green.bold(`SUCCESS! `) + chalk.white(`${successMsg}`)
        );
        return commitMessageInput();
    } catch (error) {
        return spinner.fail(
            chalk.red.bold(`ERROR! `) + chalk.white(`${error}`)
        );
    }
};

// Prompt for commit message
const commitMessageInput = function () {
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
                return abortCommit(spinner);
            });
    }
};

// Executes commit command with user message
const commitCommand = async function (message) {
    spinner = ora(`Committing files...`).start();
    try {
        await execa(
            "git",
            ["commit", "-m", `"${message.replace(/"/g, `""`)}"`],
            {
                cwd: directory,
                all: true
            }
        );
        spinner.succeed(
            chalk.green.bold(`SUCCESS! `) +
            chalk.white(`"${message}" successfully committed`)
        );
        return pushConfirm(message);
    } catch (error) {
        return spinner.fail(
            chalk.red.bold(`ERROR! `) + chalk.white(`${error}`)
        );
    }
};

// Prompts user to push to remote repository or not
const pushConfirm = function (message) {
    if (pushFlag === true) {
        return pushCommand(message);
    } else {
        return pushCheck.run().then((answer) => {
            if (answer === "Yes") {
                return pushCommand(message);
            } else {
                return abortPush(spinner);
            }
        });
    }
};

const pushCommand = async function (message) {
    spinner = ora(
        `Pushing "${message}" to remote repository on branch: ${currentBranch}`
    ).start();
    try {
        const p = await execa("git", ["push"], { cwd: directory, all: true });
        return spinner.succeed(
            chalk.green.bold(`SUCCESS!\n`) +
            chalk.blue.bold(`Commit: `) + chalk.white(`${message}\n`) +
            chalk.blue.bold(`Branch: `) + chalk.white(`${currentBranch}\n`) +
            chalk.blue.bold(`Remote: `) + chalk.white(`${gitHubUrl}`)
        );
    } catch (p_1) {
        if (p_1.exitCode === 128) {
            spinner.warn(
                chalk.yellow.bold(`ALERT! `) +
                chalk.white(
                    `${currentBranch} branch does not exist in remote repository yet.`
                )
            );
            return gitPushUpstream(currentBranch);
        } else {
            spinner.fail(
                chalk.red.bold(`ERROR! `) +
                chalk.white(
                        `Could not push to remote repository. See details below:\n` +
                        `${p_1.all}`
                    )
            );
        }
    }
};

const identifyCurrentBranch = async function () {
    const p = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: directory,
        all: true
    });
    currentBranch = p.stdout;
};

const gitPushUpstream = async function (currentBranch) {
    spinner = ora(
        `Attempting to set ${currentBranch} as upstream and push...`
    ).start();
    try {
        const p = await execa(
            "git",
            ["push", "-u", "origin", `${currentBranch}`],
            {
                cwd: directory,
                all: true
            }
        );
        spinner.succeed(
            chalk.green.bold(`SUCCESS!\n `) +
            chalk.blue.bold(`Commit: `) + chalk.white(`${message}\n`) +
            chalk.blue.bold(`Branch: `) + chalk.white(`${currentBranch}\n`) +
            chalk.blue.bold(`Remote: `) + chalk.white(`${gitHubUrl}`)
        );
    } catch (p_1) {
        spinner.fail(
            chalk.red.bold(`ERROR!`) +
            chalk.white(
                ` Could not push to remote repository via --set-upstream. See details below:\n` +
                `${p_1}`
            )
        );
    }
};

function abortPush(spinner) {
    spinner.warn(
        chalk.yellow.bold(`ALERT! `) +
        chalk.white(`Changes not pushed to remote repository`)
    );
}

function abortCommit(spinner) {
    spinner.warn(
        chalk.yellow.bold(`ALERT! `) + chalk.white(`Commit step aborted`)
    );
}

function invalidCommitMsg(spinner) {
    spinner.warn(
        chalk.yellow.bold(`ALERT! `) +
        chalk.white(`Invalid commit message. Commit step aborted`)
    );
}

function noFilesStaged(spinner) {
    spinner.warn(
        chalk.yellow.bold(`ALERT! `) + chalk.white(`No files selected to stage`)
    );
}

/* ------------------
GitBuddy Core prompts
------------------ */
const statusCheck = new MultiSelect({
    type: "checkbox",
    name: "stageFiles",
    message: `1/3: Select the files you'd like to stage (Space to select)`,
    choices: unstagedFiles
});

const commitMsg = new Input({
    name: "commitInput",
    message: `2/3: Enter commit message`
});

const pushCheck = new Select({
    name: "pushCheck",
    message: `3/3: Push to remote repository?`,
    choices: ["Yes", "No"]
});
