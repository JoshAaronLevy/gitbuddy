#!/usr/bin/env node
'use strict'
const execa = require('execa');
const directory = process.cwd();
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
const log = require('debug')('gitbuddy');
let spinner = null;
let stageFlag = false;
let commitFlag = false;
let defaultMessage = '';
let message = '';
let pushFlag = false;
let unstagedFiles = [];
let stagedFiles = [];
let currentBranch = '';
let fileList;

// Test

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
    console.log(error);
  })
  .then(() => {
    log('Completed steps, forcing exit...')
    process.exit(0);
  });
};

const checkStatus = function() {
  return execa('git', ['status'], {cwd: directory})
    .then((p) => {
      fileList = p.stdout.split('\n');
      let sliceIndex = 0;
      for (let i = 0; i < fileList.length; i ++) {
        fileList[i] = fileList[i].trim();
        if (fileList[i] === 'Changes not staged for commit:') {
          sliceIndex = i + 4;
        }
      }
      fileList = fileList.slice(sliceIndex, (fileList.length - 2));
      for (let i = 0; i < fileList.length; i ++) {
        fileList[i] = fileList[i].slice(12);
        unstagedFiles.push(fileList[i]);
      }
      return fileSelection();
  });
};

const fileSelection = function() {
  if (stageFlag === true) {
    stagedFiles = ['-A'];
    return stagingCommand(stagedFiles);
  } else {
    return statusCheck.run().then(answer => {
      if (answer.length < 1) {
        return Promise.reject(Error(`Alert: No files staged for commit! ${answer}`));
      } else {
        stagedFiles = answer;
        return stagingCommand(stagedFiles);
      }
    });
  }
};

const stagingCommand = function(stagedFiles) {
  spinner = ora(`Staging ${stagedFiles.length} files...`).start();
  return execa('git', ['add', stagedFiles], {cwd: directory, all: true})
    .then((p) => {
      // checkChildProcess(p);
      if (stagedFiles.length === 1) {
        spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`${stagedFiles.length} file staged`));
      } else if (stagedFiles.length > 1) {
        spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`${stagedFiles.length} files staged`));
      }
      return commitMessageInput();
    }).catch((error) => {
      log('STAGING.FAIL', error);
      return Promise.reject(new Error(error));
    });
};

const commitMessageInput = function() {
  if (commitFlag === true) {
    message = defaultMessage;
    return commitCommand(message);
  } else {
    return commitMsg.run().then(answer => {
      message = answer;
      return commitCommand(message);
    });
  }
};

const commitCommand = function(message) {
  spinner = ora(`Committing files...`).start();
  return execa('git', ['commit', '-m', `"${message.replace(/"/g, `""`)}"`], {cwd: directory, all: true})
    .then((p) => {
      // checkChildProcess(p);
      spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`"${message}" successfully committed`));
      return pushConfirm(message);
    }).catch((p) => {
      console.error(p);
      return Promise.reject(new Error(`Could not commit changes. ${p}`));
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
      // checkChildProcess(p);
      let gitHubUrl = p.all;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      return spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Successfully pushed "${message}" to: \n` +
      chalk.white.bold(`  ${gitHubUrl}`)));
    }).catch((p) => {
      if (p.exitCode === 128) {
        spinner.warn(chalk.yellow.bold(`WARNING: `) + chalk.yellow(`Current branch does not exist in remote repository yet.`));
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
      // checkChildProcess(p);
      log('identifyGitBranch', p.all);
      currentBranch = p.stdout;
      return gitPushUpstream(currentBranch);
    });
};

const gitPushUpstream = function(currentBranch) {
  spinner = ora(`Attempting to set ${currentBranch} as upstream and push...`).start();
  return execa('git', ['push', '-u', 'origin', `${currentBranch}`], {cwd: directory, all: true})
    .then((p) => {
      let gitHubUrl = p.all;
      // checkChildProcess(p);
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      gitHubUrl = gitHubUrl.split(',');
      gitHubUrl = gitHubUrl[1].toString()
      return spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Successfully set upstream and pushed to: `) +
      chalk.white.bold(`  ${gitHubUrl}`));
    })
    .catch((p) => {
      console.error(p);
      spinner.fail(chalk.red.bold(`ERROR:`) + chalk.red(` Could not push to remote repository via --set-upstream. See details below:\n` + 
      `${p}`));
    });
};

function checkChildProcess(process) {
  if (process.exitCode !== 0) {
    console.warn(`WARNING: Non Zero Exit code: ${process.exitCode}: ${p.command}`);
    log(`CRITICAL ERROR:`, process.all);
  }
  return process;
}

function abortPush(spinner) {
  // spinner = ora().stop();
  return spinner.warn(chalk.yellow.bold(`ALERT: ` + chalk.yellow(`Canceled push to remote repository`)));
};

/* -------------
Enquirer prompts
------------- */
const statusCheck = new MultiSelect({
  type: 'checkbox',
  name: 'stageFiles',
  message: 'Which files would you like to stage for commit?',
  choices: unstagedFiles
});

const commitMsg = new Input({
  name: 'commitInput',
  message: 'What commit message would you like to use?'
});

const pushCheck = new Select({
  name: 'pushCheck',
  message: 'Would you like to push your changes?',
  choices: ['Yes', 'No']
});
