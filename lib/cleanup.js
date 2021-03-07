#!/usr/bin/env node
'use strict';
const execa = require('execa');
const directory = process.cwd();
const { Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
let spinner = null;
let currentBranch = '';
let currentDeleteBranch = '';
let deleteBranchList = [];
let branchList = [];
let availableBranches = [];

module.exports = async (command) => {
  // console.log(command);
  try {
    await identifyCurrentBranch();
    await identifyLocalBranches();
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
};

const identifyCurrentBranch = async function() {
  const p = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: directory,
    all: true,
  });
  currentBranch = p.stdout;
};

function branchFeeder(message) {
  deleteBranchList = message;
  currentDeleteBranch = deleteBranchList[0];
  deleteBranchList.shift();
  if (deleteBranchList.length > 0) {
    return deleteBranchesCommand(currentDeleteBranch);
  }
};

const deleteBranchesCommand = async function(currentDeleteBranch) {
  spinner = ora(`Deleting ${currentDeleteBranch}...`).start();
  try {
    await execa('git', ['branch', '-D', `${currentDeleteBranch}`], {
      cwd: directory,
      all: true,
    });
    spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.white(`"${currentDeleteBranch}" successfully deleted`)
    );
    return branchFeeder();
  } catch (error) {
    return spinner.fail(chalk.red.bold(`ERROR! `) + chalk.white(`${error}`));
  }
};

const identifyLocalBranches = async function () {
  spinner = ora(`Gathering local branches...`).start();
  branchList.length = 0;
  availableBranches.length = 0;
  try {
    const p = await execa('git', ['branch', '-l'], { cwd: directory });
    branchList = p.stdout.split('\n');
    for (let i = 0; i < branchList.length; i++) {
      branchList[i] = branchList[i].trim();
      if (branchList[i].startsWith('* ') === false && branchList[i] != 'master') {
        availableBranches.push(branchList[i])
      }
    }
    if (availableBranches.length === 1) {
      spinner.succeed(chalk.bold(`${availableBranches.length} branch found`));
      return branchSelection(availableBranches);
    } else if (availableBranches.length > 1) {
      spinner.succeed(chalk.bold(`${availableBranches.length} branches found`));
      return branchSelection(availableBranches);
    } else {
      return noBranchesAvailable(spinner);
    }
  } catch (e) {
    return spinner.warn(
      chalk.yellow.bold(`ALERT! `) + chalk.white(`${e}`)
    );
  }
};

function noBranchesAvailable(spinner) {
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `No additional branches found`
      )
  );
};

function branchDeleteAborted(spinner) {
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `Aborted branch deletion`
      )
  );
};

const branchSelection = function(availableBranches) {
  spinner = ora();
  return listBranches
    .run()
    .then((answer) => {
      if (answer.length === 1) {
        spinner.succeed(chalk.bold(`${answer.length} branch selected`));
        return branchDeleteConfirm(answer);
      } else if (availableBranches.length > 1) {
        spinner.succeed(chalk.bold(`${answer.length} branches selected`));
        return branchDeleteConfirm(answer);
      } else {
        return branchDeleteAborted(spinner);
      }
    })
    .catch((error) => {
      return Promise.reject(new Error(error));
    });
};

const branchDeleteConfirm = function(message) {
  return confirmBranchDelete
    .run()
    .then((answer) => {
      answer === 'Yes' ? branchFeeder(message) : abortPush(spinner)
    })
    .catch((error) => {
      return Promise.reject(new Error(error));
    });
};

/* -------------------
Branch Cleanup prompts
------------------- */
const listBranches = new MultiSelect({
  type: 'checkbox',
  name: 'branchList',
  message: `1/2: Select the local branches you'd like to delete (Space to select)`,
  choices: availableBranches
});

const confirmBranchDelete = new Select({
  name: 'confirmBranchDelete',
  message: `2/2: Are you sure? This cannot be undone`,
  choices: ['Yes', 'No']
});
