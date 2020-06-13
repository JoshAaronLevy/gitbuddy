#!/usr/bin/env node
'use strict'
const execa = require('execa');
const directory = process.cwd();
const Enquirer = require('enquirer');
const { prompt } = require('enquirer');
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');

let unstagedFiles = [];
let stagedFiles = [];
let message = '';
let currentBranch = '';

let fileList;

module.exports = async() => {
  await checkStatus();
};

const checkStatus = function() {
  const p = execa('git', ['status'])
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
    fileSelection();
  }).catch((p) => {
    return p.all;
  });
  return p
};

const fileSelection = function() {
  statusCheck.run().then(answer => {
    if (answer.length < 1) {
      abortPrompts();
    } else {
      stagedFiles = answer.join(' ');
      stagingCommand(answer, stagedFiles);
    }
  }).catch(() => {
    console.error
  })
  return;
}

const stagingCommand = function(answer, stagedFiles) {
  const spinner = ora;
  const p = execa('git', ['add', `${stagedFiles}`], {cwd: directory})
    .then(() => {
      spinner(chalk.green.bold(`${answer.length} files staged`)).succeed();
      commitMessageInput();
    }).catch((p) => {
      spinner(`Could not stage files. See error details below:\n`).fail();
      console.log(stagedFiles);
      console.log(p);
    });
    return p;
}

const commitMessageInput = function() {
  commitMsg.run().then(answer => {
    message = answer;
    commitCommand();
  }).catch(() => {
    abortPrompts();
    console.error
  });
  return;
}

const commitCommand = function() {
  const spinner = ora;
  const p = execa('git', ['commit', '-m', `"${message}"`], {cwd: directory})
    .then(() => {
      spinner(chalk.green.bold(`${message} successfully committed`)).succeed();
      pushConfirm();
    }).catch((p) => {
      spinner(chalk.red.bold(`Error:`) + ` Could not commit changes. See details below:\n`).fail();
      console.log(p);
    });
    return p
}

const pushConfirm = function() {
  pushCheck.run()
    .then(answer => {
      if (answer === 'Yes') {
        pushCommand();
      } else {
        abortPrompts();
      }
    }).catch(() => {
      console.error
    });
    return;
}

const pushCommand = function() {
  const spinner = ora(`Pushing "${message}" to GitHub...`).start();
  const p = execa('git', ['push'], {cwd: directory})
    .then((p) => {
      let gitHubUrl = p.stderr;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      spinner.succeed(chalk.green.bold(`Successfully pushed "${message}" to:) \n` +
      chalk.green(`  ${gitHubUrl}`)));
    }).catch((p) => {
      if (p.exitCode === 128) {
        spinner.warn(chalk.yellow.bold(`Warning:`) + ` Current branch does not exist in GitHub yet.`);
        identifyGitBranch();
      } else {
        spinner.fail(chalk.red.bold(`Error:`) + ` Could not push to GitHub. See details below:\n` + 
        `${p}`);
      }
    });
    return p
}

const identifyGitBranch = function() {
  const p = execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory})
    .then((p) => {
      console.log(p.stdout);
      currentBranch = p.stdout;
      gitPushUpstream(currentBranch);
    }).catch((p) => {
      return p.all;
    });
    return p
}

const gitPushUpstream = function(currentBranch) {
  const spinner = ora(`Attempting to set ${currentBranch} as upstream and push...`).start();;
  const p = execa('git', ['push', '-u', 'origin', `${currentBranch}`], {cwd: directory})
    .then((p) => {
      let gitHubUrl = p.stderr;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      gitHubUrl = gitHubUrl.split(',');
      gitHubUrl = gitHubUrl[1].toString()
      spinner.succeed(`Successfully set upstream and pushed to:\n` +
      chalk.green(`  ${gitHubUrl}`));
    }).catch((p) => {
      console.log(p);
      spinner.fail(chalk.red.bold(`Error:`) + ` Could not push to GitHub via --set-upstream. See details below:\n` + 
      `${p}`);
    });
    return p
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

function abortPrompts() {
  const spinner = ora();
  spinner.stop();
  return ora(chalk.yellow.bold(`Alert: No files staged for commit`)).warn();
};
