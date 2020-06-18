#!/usr/bin/env node
'use strict'
const execa = require('execa');
const directory = process.cwd();
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
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

module.exports = (command) => {
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
  return checkStatus()
  .catch(error => {
    console.error(error);
  })
  .then(() => {
    process.exit(0);
  });
};

// Ensure git remote exists

// Find changed files
const checkStatus = function() {
  spinner = ora(`Gathering file changes...`).start();
  untrackedFileList = [];
  trackedFileList = [];
  fileList = [];
  trackedStartIndex = 0;
  trackedEndIndex = 0;
  untrackedIndex = 0;
  return execa('git', ['status'], {cwd: directory})
  .then((p) => {
    fileList = p.stdout.split('\n');
    for (let i = 0; i < fileList.length; i ++) {
      fileList[i] = fileList[i].trim();
      if (fileList[i] === 'Changes not staged for commit:') {
        trackedStartIndex = i + 3;
        trackedEndIndex = (fileList.length - 2);
      }
      if (fileList[i] === 'Untracked files:') {
        untrackedIndex = i + 2;
        trackedEndIndex = i - 1;
      }
    }
    if (trackedStartIndex > 0) {
      trackedFileList = fileList.slice(trackedStartIndex, trackedEndIndex);
      for (let i = 0; i < trackedFileList.length; i ++) {
        if (trackedFileList[i] !== '') {
          unstagedFiles.push(trackedFileList[i].slice(12))
        }
      }
    }
    if (untrackedIndex > 0) {
      untrackedFileList = fileList.slice(untrackedIndex, (fileList.length - 2));
      for (let i = 0; i < untrackedFileList.length; i ++) {
        if (untrackedFileList[i] !== '') {
          unstagedFiles.push(untrackedFileList[i]);
        }
      }
    }
    if (unstagedFiles.length === 1) {
      spinner.succeed(chalk.bold(`${unstagedFiles.length} file found!`));
      return fileSelection(unstagedFiles);
    } else if (unstagedFiles.length > 1) {
      spinner.succeed(chalk.bold(`${unstagedFiles.length} files found!`));
      return fileSelection(unstagedFiles);
    } else {
      return spinner.warn(chalk.yellow.bold(`ALERT: `) + chalk.yellow(`No file change(s) found!`));
    }
  }).catch(() => {
    return spinner.warn(chalk.yellow.bold(`ALERT: `) + chalk.yellow(`Process aborted!`));
  });
};

// Select from list of unstaged files
const fileSelection = function(unstagedFiles) {
  spinner = ora();
  if (stageFlag === true) {
    stagedFiles = ['-A'];
    return stagingCommand(stagedFiles);
  } else {
    return statusCheck.run().then(answer => {
      if (answer.length < 1) {
        return spinner.warn(chalk.yellow.bold(`ALERT: `) + chalk.yellow(`No file(s) staged!`));
      } else {
        return stagingCommand(answer);
      }
    }).catch(error => {
      return Promise.reject(new Error(error));
    });
  }
};

// Runs command to stage selected files
const stagingCommand = function(answer) {
  spinner = ora(`Staging files...`).start();
  return execa('git', ['add', ...answer], {cwd: directory, all: true})
    .then(() => {
      spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Changes staged`));
      return commitMessageInput();
    }).catch((error) => {
      return spinner.fail(chalk.red.bold(`ERROR: `) + chalk.red(`${error}`));
      // return Promise.reject(new Error(error));
    });
};

// Prompt for commit message
const commitMessageInput = function() {
  if (commitFlag === true) {
    message = defaultMessage;
    return commitCommand(message);
  } else {
    return commitMsg.run().then(answer => {
      message = answer;
      return commitCommand(message);
    }).catch(error => {
      return Promise.reject(new Error(error));
    });
  }
};

// Executes commit command with user message
const commitCommand = function(message) {
  spinner = ora(`Committing files...`).start();
  return execa('git', ['commit', '-m', `"${message.replace(/"/g, `""`)}"`], {cwd: directory, all: true})
    .then(() => {
      spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`"${message}" successfully committed`));
      return pushConfirm(message);
    }).catch((error) => {
      return spinner.fail(chalk.red.bold(`ERROR: `) + chalk.red(`${error}`));
    });
};

const pushConfirm = function(message) {
  if (pushFlag === true) {
    return pushCommand(message);
  } else {
    return pushCheck.run()
      .then(answer => answer === 'Yes' ? pushCommand(message) : abortPush(spinner))
  }
};

const pushCommand = function(message) {
  spinner = ora(`Pushing "${message}" to remote repository...`).start();
  return execa('git', ['push'], {cwd: directory, all: true})
    .then((p) => {
      let gitHubUrl = p.all;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      return spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Successfully pushed "${message}" to: \n` +
      chalk.white.bold(`  ${gitHubUrl}`)));
    }).catch((p) => {
      if (p.exitCode === 128) {
        spinner.warn(chalk.yellow.bold(`ALERT: `) + chalk.yellow(`Current branch does not exist in remote repository yet.`));
        return identifyGitBranch();
      } else {
        spinner.fail(chalk.red.bold(`ERROR: `) + chalk.red(`Could not push to GitHub. See details below:\n` + 
        `${p.all}`));
      }
    });
};

const identifyGitBranch = function() {
  return execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory, all: true})
    .then((p) => {
      currentBranch = p.stdout;
      return gitPushUpstream(currentBranch);
    });
};

const gitPushUpstream = function(currentBranch) {
  spinner = ora(`Attempting to set ${currentBranch} as upstream and push...`).start();
  return execa('git', ['push', '-u', 'origin', `${currentBranch}`], {cwd: directory, all: true})
    .then((p) => {
      let gitHubUrl = p.all;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      gitHubUrl = gitHubUrl.split(',');
      gitHubUrl = gitHubUrl[1].toString()
      return spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Successfully set upstream and pushed to: `) +
      chalk.white.bold(`  ${gitHubUrl}`));
    })
    .catch((p) => {
      spinner.fail(chalk.red.bold(`ERROR:`) + chalk.red(` Could not push to remote repository via --set-upstream. See details below:\n` + 
      `${p}`));
    });
};

function checkChildProcess(process) {
  if (process.exitCode !== 0) {
    console.warn(`WARNING: Non Zero Exit code: ${process.exitCode}: ${p.command}`);
  }
  return process;
}

function abortPush(spinner) {
  return spinner.warn(chalk.yellow.bold(`ALERT: ` + chalk.yellow(`Changes not pushed to remote repository`)));
};

/* -------------
Enquirer prompts
------------- */
const statusCheck = new MultiSelect({
  type: 'checkbox',
  name: 'stageFiles',
  message: `1/3: Select files to stage (Space to select)`,
  choices: unstagedFiles
});

const commitMsg = new Input({
  name: 'commitInput',
  message: `2/3: Enter commit message`
});

const pushCheck = new Select({
  name: 'pushCheck',
  message: `3/3: Push to remote repository?`,
  choices: ['Yes', 'No']
});
