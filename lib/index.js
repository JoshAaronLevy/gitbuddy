#!/usr/bin/env node
'use strict'
const inquirer = require('inquirer');
const directory = process.cwd();
const execa = require('execa');
const Enquirer = require('enquirer');
const { prompt } = require('enquirer');
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
const runner = require('../lib/runner');

const spinner = ora;

let branchArray = [];
let unstagedFiles = [];
let stagedFiles = [];

const findGitBranches = function() {
  const p = execa('git', ['branch', '-l'], {cwd: directory})
  .then((p) => {
    localBranches = p.stdout.split('\n');
    branchArray.push('Create new');
    for (let i = 0; i < localBranches.length; i++) {
      localBranches[i] = localBranches[i].trim();
      if (localBranches[i] !== '* master') {
        branchArray.push(localBranches[i]);
      }
    }
    return branchArray;
  }).catch((p) => {
    return p.all;
  });
  return p
};

let localBranches = findGitBranches();

let fileList;

module.exports = function(command, message) {
  checkStatus();
  // identifyBranch();

  function checkStatus() {
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
      return fileSelection();
    }).catch((p) => {
      return p.all;
    });
    return p
  };

  function fileSelection() {
    statusCheck.run().then(answer => {
      if (answer.length < 1) {
        abortPrompts();
      } else {
        stagedFiles = answer.join(' ');
        stagingCommand(answer, stagedFiles)
      }
    }).catch(() => {
      console.error
    })
    return;
  }

  function stagingCommand(answer, stagedFiles) {
    const spinner = ora(`Staging ${answer.length} file(s)...`).start();
    const p = execa('git', ['add', `${stagedFiles}`], {cwd: directory})
      .then(() => {
        spinner.succeed(chalk.green.bold(`${answer.length} files staged`));
        commitMessageInput();
      }).catch((p) => {
        spinner.fail(`Could not stage files. See error details below:\n`);
        console.log(stagedFiles);
        console.log(p);
      });
      return p;
  }

  function commitMessageInput() {
    commitMsg.run()
      .then(answer => {
        message = answer;
        commitCommand(message);
      }).catch(() => {
        console.error
      });
      return;
  }

  function commitCommand(message) {
    const spinner = ora(`Committing your awesome code...`).start();
    const p = execa('git', ['commit', '-m', `"${message}"`], {cwd: directory})
      .then(() => {
        spinner.succeed(chalk.green.bold(`${answer} successfully committed`));
      }).catch((p) => {
        spinner.fail(chalk.red.bold(`Error:`) + ` Could not commit changes. See details below:\n`);
        console.log(p);
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
    message: 'What commit message would you like to use?'
  });

  const pushCheck = new Select({
    name: 'pushCheck',
    message: 'Would you like to push your changes?',
    choices: ['Yes', 'No']
  });

  function commitPrompt() {
    inquirer.prompt(commitQs).then(function(answers) {
      const commitMessage = answers.commitMessage;
      const spinner = ora;
      return spinner(chalk.green.bold(`${commitMessage} successfully committed`)).succeed();
    });
  }

  function abortPrompts() {
    const spinner = ora();
    spinner.stop();
    return ora(chalk.yellow.bold(`Alert: No files staged for commit`)).warn();
  };

  function identifyBranch() {
    let currentBranch = '';
    const p = execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory})
      .then((p) => {
        currentBranch = p.stdout;
        return branchEval(currentBranch);
      }).catch((p) => {
        return p.all;
      });
    return p
  };

  function branchEval(currentBranch) {
    if (currentBranch === 'master') {
      return branchQuestions(message, currentBranch);
    } else {
      return runner(message, currentBranch);
    }
  };

  function branchQuestions(currentBranch) {
    return inquirer.prompt(branchQs).then(function(answers) {
      answers.branchAlert = 'Switch to existing branch';
      if (answers.newBranch === 'existing') {
        return branchQuestions();
      } else {
        return branchQuestions(answers, currentBranch, message);
        // return runner(answers, currentBranch, message);
      }
    });
  }
  return (command, message);
}

let branchQs = [
  {
    type: 'list',
    name: 'branchAlert',
    message: `Warning: Looks like you're on the master branch. What would you like to do?`,
    choices: [
      `Continue with master branch`,
      'Switch to existing branch',
      'Create a new branch'
    ],
    when: function(currentBranch) {
      return currentBranch === 'master';
    }
  },
  {
    type: 'list',
    name: 'existingBranch',
    message: 'Which branch would you like to switch to?',
    choices: branchArray,
    when: function(answers) {
      return answers.branchAlert === 'Switch to existing branch' || answers.newBranch === 'existing';
    }
  },
  {
    type: 'input',
    name: 'newBranch',
    message: 'What do you want to name the new branch? (enter for an existing branch instead)',
    default: 'existing',
    when: function(answers) {
      return answers.branchAlert === 'Create a new branch' || answers.existingBranch === 'Create new';
    },
    validate: function(answer) {
      const pass = answer.match(/^[A-Za-z0-9_-]*$/)
      if (answer.length > 2 && pass) {
        return true;
      } else {
        return "Please enter a valid branch name (min. 2 alphanumeric characters only)";
      }
    }
  }
];

let stagingQs = [
  {
    type: 'checkbox',
    name: 'stageFiles',
    message: 'Which files would you like to stage for commit?',
    choices: unstagedFiles
  }
];

let commitQs = [
  {
    type: 'input',
    name: 'commitMessage',
    message: 'Commit message',
    validate: function(answer) {
      if (answer.length > 2) {
        return true;
      } else {
        return "Please enter a valid commit message (min. 2 alphanumeric characters)";
      }
    }
  }
];
