#!/usr/bin/env node
'use strict'
const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const runner = require('./runner.js');
const ora = require('ora');
const execa = require('execa');
const directory = process.cwd();

let questions = [
  {
    type: 'list',
    name: 'branchAlert',
    message: `Warning: Looks like you're on the master branch. What would you like to do?`,
    choices: [
      `Continue with the master branch (you're better than that...)`,
      'Switch to an existing branch',
      'Create and use a new branch'
    ]
  },
  {
    type: 'list',
    name: 'existingBranch',
    message: 'Which branch would you like to switch to?',
    choices: [
      'PostgreSQL',
      'SQLite',
      'MySQL',
      'MariaDB'
    ],
    when: function(answers) {
      return answers.branchAlert === 'Switch to an existing branch';
    }
  },
  {
    type: 'input',
    name: 'newBranch',
    message: 'What do you want to name the new branch? (enter for an existing branch instead)',
    default: 'existing',
    when: function(answers) {
      return answers.branchAlert === 'Create and use a new branch' || answers.existingBranch === 'Create new';
    },
    validate: function(answer) {
      const pass = answer.match(/^[A-Za-z0-9_-]*$/)
      if (answer.length > 2 && pass) {
        return true;
      } else {
        return "Please enter a valid branch name (min. 2 alphanumeric characters only)";
      }
    }
  },
  {
    type: 'list',
    name: 'currentBranch',
    message: 'Which branch would you like to switch to?',
    choices: [
      'PostgreSQL',
      'SQLite',
      'MySQL',
      'MariaDB'
    ],
    when: function(answers) {
      return answers.newBranch === 'existing';
    }
  },
];

module.exports = function(command) {
  console.log(command);
  return identifyBranch();
  // findGitBranches();
}

const identifyBranch = function() {
  let currentBranch = '';
	const p = execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory})
    .then((p) => {
      currentBranch = p.stdout;
      console.log(currentBranch);
      questionEval(currentBranch);
    }).catch((p) => {
      return p.all;
    });
	return p
};

function questionEval(currentBranch) {
  if (currentBranch === 'master') {
    promptQuestions();
  }
};

function promptQuestions() {
  inquirer.prompt(questions).then(function(answers) {
    findGitBranches();
    return answers;
  });
}

const findGitBranches = function() {
  let localBranches = [
    'Create new branch'
  ];
  const p = execa('git', ['branch', '-l'], {cwd: directory})
  .then((p) => {
    localBranches = p.stdout.split('\n');
    console.log(localBranches);
    console.log(p);
    // currentBranch = p.stdout;
  }).catch((p) => {
    return p.all;
  });
  return p
};