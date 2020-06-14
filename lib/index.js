#!/usr/bin/env node
'use strict'
const execa = require('execa');
const directory = process.cwd();
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
const log = require('debug')('gitbuddy');

let spinner = null;
let unstagedFiles = [];
let stagedFiles = [];
let message = '';
let currentBranch = '';

let fileList;

module.exports = () => {
  return checkStatus()
  .catch(error => {
    if (spinner && spinner.isSpinning) {
      spinner.fail(chalk.red.bold(`Error: `) + error.message);
    } else {
      console.error(`WARNING: No spinner in-progress.`, error)
    }
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
      return fileSelection(); // TODO: pass args
    });
};

const fileSelection = function() {
  return statusCheck.run().then(answer => {
    if (answer.length < 1) {
      return abortPrompts(spinner);
    } else {
      stagedFiles = answer
      return stagingCommand(answer);
    }
  });
};

const stagingCommand = function(stagedFiles) {
  spinner = ora(`Staging ${stagedFiles.length} files...`).start();
  return execa('git', ['add', ...stagedFiles], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      spinner.succeed(chalk.green.bold(`${stagedFiles.length} files staged`));
      return commitMessageInput();
    }).catch((error) => {
      log('STAGING.FAIL', error);
      return Promise.reject(new Error(`Could not stage files.`));
    });
};

const commitMessageInput = function() {
  return commitMsg.run().then(answer => {
      message = answer;
      return commitCommand();
    }).catch((err) => {
      console.error(err);
      return abortPrompts(spinner);
    });
};

const commitCommand = function() {
  spinner = ora(`Committing files...`).start();
  return execa('git', ['commit', '-m', `"${message.replace(/"/g, `""`)}"`], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      spinner.succeed(chalk.green.bold(`${message} successfully committed`));
      return pushConfirm();
    }).catch((p) => {
      // spinner = ora(chalk.red.bold(`Error:`) + ` Could not commit changes. See details below:\n`).fail();
      console.error(p);
      return Promise.reject(new Error(`Could not commit changes.`));
    });
};

const pushConfirm = function() {
  return pushCheck.run()
    .then(answer => answer === 'Yes' ? pushCommand() : abortPrompts(spinner))
};

const pushCommand = function() {
  spinner = ora(`Pushing "${message}" to GitHub...`).start();
  return execa('git', ['push'], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      let gitHubUrl = p.all;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      return spinner.succeed(chalk.green.bold(`DONE! `) + `Successfully pushed "${message}" to: \n` +
      chalk.green(`  ${gitHubUrl}`));
    });
};

const identifyGitBranch = function() {
  return execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      log(p.stdout);
      currentBranch = p.stdout;
      return gitPushUpstream(currentBranch);
    });
};

const gitPushUpstream = function(currentBranch) {
  spinner = ora(`Attempting to set ${currentBranch} as upstream and push...`).start();
  return execa('git', ['push', '-u', 'origin', `${currentBranch}`], {cwd: directory, all: true})
    .then((p) => {
      let gitHubUrl = p.all;
      checkChildProcess(p);
      // log(`PUSH.STDALL:`, p.all);
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      gitHubUrl = gitHubUrl.split(',');
      gitHubUrl = gitHubUrl[1].toString()
      return spinner.succeed(`Successfully set upstream and pushed to: ` +
      chalk.green(`  ${gitHubUrl}`));
    })
    // .catch((p) => {
    //   console.log(p);
    //   spinner.fail(chalk.red.bold(`Error:`) + ` Could not push to GitHub via --set-upstream. See details below:\n` + 
    //   `${p}`);
    // });
    // return p
};

function checkChildProcess(process) {
  if (process.exitCode !== 0) {
    console.warn(`WARNING: Non Zero Exit code: ${process.exitCode}: ${p.command}`);
    log(`CRITICAL ERROR:`, process.all);
  }
  return process;
}

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

function abortPrompts(spinner) {
  return spinner.warn(chalk.yellow.bold(`Alert: No files staged for commit`));
  // return ora(chalk.yellow.bold(`Alert: No files staged for commit`)).warn();
};
