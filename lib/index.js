#!/usr/bin/env node
'use strict'
const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const runner = require('./runner.js');
const ora = require('ora');

let questions = [
  {
    type: 'list',
    name: 'branchAlert',
    message: `Warning: Looks like you're on the master branch. What would you like to do?`,
    choices: [
      'Continue with the master branch',
      'Create and use a new branch',
      'Switch to an existing branch'
    ]
  },
  {
    type: 'input',
    name: 'newBranch',
    message: 'What do you want to name the new branch?',
    when: function(answers) {
      return answers.branchAlert === 'Create and use a new branch';
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
    type: 'input',
    name: 'existingBranch',
    message: 'Which branch would you like to switch to?',
    when: function(answers) {
      return answers.branchAlert === 'Switch to an existing branch';
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

module.exports = function(command) {
  console.log(command);
  // if (typeof(command) === "string") {
  //   questions.shift();
  // }
  inquirer.prompt(questions).then(function(answers) {
    console.log(answers);
    // if (typeof(command) === "string") {
    //   projName = command;
    // } else {
    //   projName = answers.project_name;
    // }
    // console.log(chalk.green(
    //   `Constructing ` +
    //   chalk.green.bold(`${projName}`) + 
    //   `. Prepare for liftoff...`));
    // runner(basePath);
  });
}