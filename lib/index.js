#!/usr/bin/env node
'use strict'
const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const runner = require('../lib/runner');
const ora = require('ora');
const execa = require('execa');
const directory = process.cwd();

let branchArray = [];
let fileArray = [];

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

const checkStatus = function() {
  const p = execa('git', ['status'])
  .then((p) => {
    fileList = p.stdout.split('\n');
    // console.log(fileList[7]);
    // console.log(fileList[7].length);
    fileArray.push('All files');
    let unstagedFiles = [];
    if (fileList[1] === 'Changes not staged for commit:') {
      for (let i = 5; i < (fileList.length - 2); i++) {
        fileList[i] = fileList[i].trim();
        fileList[i] = fileList[i].slice(12);
        unstagedFiles.push(fileList[i]);
        // if (fileList[i] !== '* master') {
          //   fileArray.push(fileList[i]);
          // }
        }
      console.log(unstagedFiles);
    }
    return fileArray;
  }).catch((p) => {
    return p.all;
  });
  return p
};

let fileList = checkStatus();

module.exports = function(command, message) {
  // checkStatus();
  // identifyBranch();
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

let commitQs = [
  {
    type: 'input',
    name: 'commitMessage',
    message: 'Commit message',
    default: 'existing',
    when: function(message) {
      return message === undefined || !message || message === null;
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
