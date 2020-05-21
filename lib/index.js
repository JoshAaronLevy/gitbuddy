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

const findGitBranches = function() {
  const p = execa('git', ['branch', '-l'], {cwd: directory})
  .then((p) => {
    localBranches = p.stdout.split('\n');
    for (let i = 0; i < localBranches.length; i++) {
      localBranches[i] = localBranches[i].trim();
      if (localBranches[i] !== '* master') {
        branchArray.push(localBranches[i]);
      }
    }
    branchArray.push('Create new');
    return branchArray;
  }).catch((p) => {
    return p.all;
  });
  return p
};

let localBranches = findGitBranches();

module.exports = function(command, message) {
  console.log(message);
  identifyBranch();
  function identifyBranch() {
    let currentBranch = '';
    const p = execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory})
      .then((p) => {
        currentBranch = p.stdout;
        return questionEval(currentBranch);
      }).catch((p) => {
        return p.all;
      });
    return p
  };

  function questionEval(currentBranch) {
    if (currentBranch === 'master') {
      return promptQuestions(currentBranch);
    } else {
      return runner(message, currentBranch);
    }
  };

  function promptQuestions(currentBranch) {
    return inquirer.prompt(questions).then(function(answers) {
      answers.branchAlert = 'Switch to existing branch';
      if (answers.newBranch === 'existing') {
        return promptQuestions();
      } else {
        return runner(answers, currentBranch, message);
      }
    });
  }
  return (command, message);
}

let questions = [
  {
    type: 'list',
    name: 'branchAlert',
    message: `Warning: Looks like you're on the master branch. What would you like to do?`,
    choices: [
      `Continue with master branch`,
      'Switch to existing branch',
      'Create a new branch'
    ]
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
