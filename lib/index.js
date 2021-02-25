#!/usr/bin/env node
'use strict';
const execa = require('execa');
const directory = process.cwd();
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
const createConfigFile = require('../templates/.gitbuddy-config')
let spinner = null;
let stageFlag = false;
let commitFlag = false;
let defaultMessage = '';
let message = '';
let trackedStartIndex = 0;
let trackedEndIndex = 0;
let untrackedIndex = 0;
let untrackedFileList = [];
let trackedFileList = [];
let unstagedFiles = [];
let stagedFiles = [];
let pushFlag = false;
let currentBranch = '';
let fileList;

module.exports = async (command) => {
  // console.log(command);
  // if (command.args[0] === 'init') {
  //   const p = await execa('git', ['push'], { cwd: directory, all: true });
  //   let gitHubUrl = p.all;
  //   gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
  //   gitHubUrl = gitHubUrl.toString();
  //   gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
  // }
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
    await identifyGitBranch();
    await checkStatus();
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
};

// Prompt for commit message
// const initCommand = function() {
//   return masterBranchLock
//     .run()
//     .then((answer) => {
//       message = answer;
//       return commitCommand(message);
//     })
//     .catch((error) => {
//       return Promise.reject(new Error(error));
//     });
// };

// Ensure git remote exists
// Find changed files
const checkStatus = async function() {
  spinner = ora(`Gathering file changes...`).start();
  untrackedFileList = [];
  trackedFileList = [];
  fileList = [];
  trackedStartIndex = 0;
  trackedEndIndex = 0;
  untrackedIndex = 0;
  try {
    const p = await execa('git', ['status'], { cwd: directory });
    fileList = p.stdout.split('\n');
    for (let i = 0; i < fileList.length; i++) {
      fileList[i] = fileList[i].trim();
      if (fileList[i] === 'Changes not staged for commit:') {
        trackedStartIndex = i + 3;
        trackedEndIndex = fileList.length - 2;
      }
      if (fileList[i] === 'Untracked files:') {
        untrackedIndex = i + 2;
        trackedEndIndex = i - 1;
      }
    }
    if (trackedStartIndex > 0) {
      trackedFileList = fileList.slice(trackedStartIndex, trackedEndIndex);
      for (let i_1 = 0; i_1 < trackedFileList.length; i_1++) {
        if (trackedFileList[i_1] !== '') {
          unstagedFiles.push(trackedFileList[i_1].slice(12));
        }
      }
    }
    if (untrackedIndex > 0) {
      untrackedFileList = fileList.slice(untrackedIndex, fileList.length - 2);
      for (let i_2 = 0; i_2 < untrackedFileList.length; i_2++) {
        if (untrackedFileList[i_2] !== '') {
          unstagedFiles.push(untrackedFileList[i_2]);
        }
      }
    }
    if (unstagedFiles.length === 1) {
      spinner.succeed(chalk.bold(`${unstagedFiles.length} file change found`));
      return fileSelection(unstagedFiles);
    } else if (unstagedFiles.length > 1) {
      spinner.succeed(chalk.bold(`${unstagedFiles.length} file changes found`));
      return fileSelection(unstagedFiles);
    } else {
      return spinner.warn(
        chalk.yellow.bold(`ALERT: `) + chalk.yellow(`No file change(s) found`)
      );
    }
  } catch (e) {
    return spinner.warn(
      chalk.yellow.bold(`ALERT: `) + chalk.yellow(`Process aborted`)
    );
  }
};

// Select from list of unstaged files
const fileSelection = function(unstagedFiles) {
  spinner = ora();
  if (stageFlag === true) {
    stagedFiles = ['-A'];
    return stagingCommand(stagedFiles);
  } else {
    return statusCheck
      .run()
      .then((answer) => {
        if (answer.length < 1) {
          return spinner.warn(
            chalk.yellow.bold(`ALERT: `) + chalk.yellow(`No file(s) staged`)
          );
        } else {
          return stagingCommand(answer);
        }
      })
      .catch((error) => {
        return Promise.reject(new Error(error));
      });
  }
};

// Runs command to stage selected files
const stagingCommand = async function(answer) {
  let successMsg = '';
  if (answer.length === 1) {
    successMsg = `1 file staged`;
  } else {
    successMsg = `${answer.length} files staged`;
  }
  spinner = ora(`Staging files...`).start();
  try {
    await execa('git', ['add', ...answer], { cwd: directory, all: true });
    spinner.succeed(
      chalk.green.bold(`SUCCESS! `) + chalk.green(`${successMsg}`)
    );
    return commitMessageInput();
  } catch (error) {
    return spinner.fail(chalk.red.bold(`ERROR: `) + chalk.red(`${error}`));
  }
};

// Prompt for commit message
const commitMessageInput = function() {
  if (commitFlag === true) {
    message = defaultMessage;
    return commitCommand(message);
  } else {
    return commitMsg
      .run()
      .then((answer) => {
        message = answer;
        return commitCommand(message);
      })
      .catch((error) => {
        return Promise.reject(new Error(error));
      });
  }
};

// Executes commit command with user message
const commitCommand = async function(message) {
  spinner = ora(`Committing files...`).start();
  try {
    await execa('git', ['commit', '-m', `"${message.replace(/"/g, `""`)}"`], {
      cwd: directory,
      all: true,
    });
    spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.green(`"${message}" successfully committed`)
    );
    return pushConfirm(message);
  } catch (error) {
    return spinner.fail(chalk.red.bold(`ERROR: `) + chalk.red(`${error}`));
  }
};

// Prompts user to push to remote repository or not
const pushConfirm = function(message) {
  if (pushFlag === true) {
    return pushCommand(message);
  } else {
    return pushCheck
      .run()
      .then((answer) =>
        answer === 'Yes' ? pushCommand(message) : abortPush(spinner)
      );
  }
};

const pushCommand = async function(message) {
  spinner = ora(
    `Pushing "${message}" to remote repository on branch: ${currentBranch}`
  ).start();
  try {
    const p = await execa('git', ['push'], { cwd: directory, all: true });
    let gitHubUrl = p.all;
    gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
    gitHubUrl = gitHubUrl.toString();
    gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
    return spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.green(
          `Successfully pushed "${message}" to: \n` +
            chalk.white.bold(`  ${gitHubUrl}`)
        )
    );
  } catch (p_1) {
    if (p_1.exitCode === 128) {
      spinner.warn(
        chalk.yellow.bold(`ALERT: `) +
          chalk.yellow(
            `${currentBranch} branch does not exist in remote repository yet.`
          )
      );
      return gitPushUpstream(currentBranch);
    } else {
      spinner.fail(
        chalk.red.bold(`ERROR: `) +
          chalk.red(
            `Could not push to GitHub. See details below:\n` + `${p_1.all}`
          )
      );
    }
  }
};

const identifyGitBranch = async function() {
  const p = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: directory,
    all: true,
  });
  currentBranch = p.stdout;
};

const gitPushUpstream = async function(currentBranch) {
  spinner = ora(
    `Attempting to set ${currentBranch} as upstream and push...`
  ).start();
  try {
    const p = await execa('git', ['push', '-u', 'origin', `${currentBranch}`], {
      cwd: directory,
      all: true,
    });
    let gitHubUrl = p.all;
    gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
    gitHubUrl = gitHubUrl.toString();
    gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
    gitHubUrl = gitHubUrl.split(',');
    gitHubUrl = gitHubUrl[1].toString();
    return spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.green(`Successfully set upstream and pushed to: `) +
        chalk.white.bold(`  ${gitHubUrl}`)
    );
  } catch (p_1) {
    spinner.fail(
      chalk.red.bold(`ERROR:`) +
        chalk.red(
          ` Could not push to remote repository via --set-upstream. See details below:\n` +
            `${p_1}`
        )
    );
  }
};

function abortPush(spinner) {
  return spinner.warn(
    chalk.yellow.bold(
      `ALERT: ` + chalk.yellow(`Changes not pushed to remote repository`)
    )
  );
}

/* -------------
Enquirer prompts
------------- */
const statusCheck = new MultiSelect({
  type: 'checkbox',
  name: 'stageFiles',
  message: `1/3: Select files to stage (Space to select)`,
  choices: unstagedFiles,
});

const commitMsg = new Input({
  name: 'commitInput',
  message: `2/3: Enter commit message`,
});

const pushCheck = new Select({
  name: 'pushCheck',
  message: `3/3: Push to remote repository?`,
  choices: ['Yes', 'No'],
});

/* ------------------
gitbuddy init prompts
------------------ */
// const masterBranchLock = new Select({
//   name: 'masterBranchLock',
//   message: `1/1: Would you like to restrict pushing to master branch?`,
//   choices: ['Yes', 'No'],
// });

// const defaultFileStaging = new Select({
//   name: 'defaultFileStaging',
//   message: `2/2: What would you like the default staging ('git add' command) to be? NOTE: You can override the default you choose for a specific commit by using the command 'gitbuddy -A'`,
//   choices: ['Let Me Select Files', 'Stage All Files'],
// });

// const defaultPushUpstream = new Select({
//   name: 'defaultPushUpstream',
//   message: `3/3: What would you like GitBuddy to do by default for pushing to your remote repository? NOTE: You can override the default you choose for a specific commit by using the command 'gitbuddy -p'`,
//   choices: ['Prompt Me Before Pushing', 'Automatically Push Changes'],
// });
