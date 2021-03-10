#!/usr/bin/env node
'use strict';
const core = require('../bin/index.js');
const execa = require('execa');
const directory = process.cwd();
const { Input, Select } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
let stageFlag = false;
let spinner = null;
let httpsUrl = ``;
let sshUrl = ``;
let gitHubUrl = ``;
let currentBranch = '';
let branchName = '';
let trackedStartIndex = 0;
let trackedEndIndex = 0;
let untrackedIndex = 0;
let untrackedFileList = [];
let trackedFileList = [];
let unstagedFiles = [];
let fileList;
let defaultError = 'Unknown Error';

module.exports = async (command) => {
  // console.log(command);
  try {
    const p = await execa('git', ['remote', '-v'], {
      cwd: directory,
      all: true,
    });
    if (p.all.match(/\bgit@github.com?:\S+/gi) != null) {
      sshUrl = p.all.match(/\bgit@github.com?:\S+/gi)[0];
      gitHubUrl = sshUrl.substring(0, sshUrl.length - 4);
    } else if (p.all.match(/\bhttps?:\/\/\S+/gi) != null) {
      httpsUrl = p.all.match(/\bhttps?:\/\/\S+/gi)[0];
      gitHubUrl = httpsUrl.substring(0, httpsUrl.length - 4);
    }
  } catch (error) {
    return error;
  }
  try {
    await identifyCurrentBranch();
    await inputBranchName();
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
};

// 1. Identifies the current branch
const identifyCurrentBranch = async function() {
  const p = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: directory,
    all: true,
  });
  currentBranch = p.stdout;
};

const checkStatus = async function() {
  spinner = ora(`Checking for file changes...`).start();
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
    if (unstagedFiles.length > 0) {
      spinner.warn(
        chalk.yellow.bold(`ALERT! `) + chalk.white(`You have changes not yet staged and committed! Run 'gitbuddy' to add, commit, and push your changes`)
      );
      // return commitConfirm();
    } else {
      spinner.succeed(
        chalk.green.bold(`SUCCESS! `) +
          chalk.white(
            `No file changes found to commit. Working directory looks clean`
          )
      );
    }
  } catch (e) {
    return spinner.warn(
      chalk.yellow.bold(`ALERT! `) + chalk.white(`Process aborted`)
    );
  }
};

// Prompts user to push to remote repository or not
// const commitConfirm = function() {
//   return commitCheck
//     .run()
//     .then((answer) => {
//       if (answer === 'Yes') {
//         return runGitBuddy();
//       } else {
//         return gitBuddyError(spinner);
//       }
//     });
// };

// const runGitBuddy = async function() {
//   try {
//     const p = await execa('gitbuddy', {
//       cwd: directory,
//       all: true,
//     });
//     console.log(p);
//     return p;
//   } catch (error) {
//     error = error.stderr;
//     return gitBuddyError(spinner);
//   }
// };

const createBranch = async function(branchName) {
  try {
    await execa('git', ['checkout', '-b', `${branchName}`], {
      cwd: directory,
      all: true,
    });
    return gitPushUpstream(branchName);
  } catch (error) {
    error = error.stderr;
    return branchCreateError(spinner, error);
  }
};

const gitPushUpstream = async function(branchName) {
  spinner = ora(
    `Attempting to set ${branchName} as upstream and push...`
  ).start();
  try {
    await execa('git', ['push', '-u', 'origin', `${branchName}`], {
      cwd: directory,
      all: true,
    });
    spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.white(
          `Commit "${branchName}" pushed to: \n` +
            chalk.white.bold(`  ${gitHubUrl}`)
        )
    );
    return checkStatus();
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

const inputBranchName = async function() {
  return branchCreate
    .run()
    .then((message) => {
      if (message.length > 0) {
        branchName = message;
        return createBranch(message);
      } else {
        return branchCreateAborted(spinner, defaultError);
      }
    })
    .catch((error) => {
      return branchCreateError(spinner, error);
    });
};

// Thrown when the process throws an error
function branchCreateError(spinner, error) {
  spinner = ora().start();
  spinner.fail(
    chalk.red.bold(`ERROR! `) +
      chalk.white(
        `Could not create branch: ${error}`
      )
  );
};

// Thrown when the process is aborted
function branchCreateAborted(spinner, error) {
  spinner = ora().start();
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `Could not create branch: ${error}`
      )
  );
};

// Thrown when the process throws an error
function gitBuddyError(spinner, error) {
  spinner = ora().start();
  spinner.fail(
    chalk.red.bold(`ERROR! `) +
      chalk.white(
        `Run 'gitbuddy' to add, commit, and push your changes`
      )
  );
};

/* --------------------
GitBuddy Branch prompts
-------------------- */
const branchCreate = new Input({
  name: 'branchInput',
  message: `Enter branch name`
});

const commitCheck = new Select({
  name: 'commitCheck',
  message: `Would you like to add, commit, and push your changes?`,
  choices: ['Yes', 'No']
});
