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
let selectedBranch = '';

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

// 1. Identifies the current branch
const identifyCurrentBranch = async function() {
  const p = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: directory,
    all: true,
  });
  currentBranch = p.stdout;
};

// 5. Feeds each branch into the deleteBranchesCommand function individually
const branchFeeder = function(message) {
  deleteBranchList = message;
  if (deleteBranchList.length > 0) {
    currentDeleteBranch = deleteBranchList.shift();
    return deleteBranchesCommand(currentDeleteBranch);
  }
};

// 6. Executes the git branch delete command with the current branch in the list
const deleteBranchesCommand = async function(selectedBranch) {
  spinner = ora(`Deleting ${selectedBranch}...`).start();
  try {
    const p = execa('git', ['branch', '-D', `${selectedBranch}`], { cwd: directory, all: true });
    spinner.succeed(
      chalk.green.bold(`SUCCESS! `) +
        chalk.white(`${selectedBranch} successfully deleted`)
    );
    console.log(p);
    return continueBranchSelection();
  } catch (error) {
    return spinner.fail(chalk.red.bold(`ERROR! `) + chalk.white(`${error}`));
  }
};

// 2. Identifies available branches you can select to delete (all except master and current branch)
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

// 3. Enquirer step for selecting branches you wish to delete
const branchSelection = function(availableBranches) {
  spinner = ora();
  return listBranches
    .run()
    .then((answer) => {
      if (answer) {
        spinner.succeed(chalk.bold(`${answer} selected`));
        selectedBranch = answer;
        return branchDeleteConfirm(selectedBranch, answer);
      } else {
        return branchDeleteAborted(spinner);
      }
    })
    // .then((answer) => {
    //   if (answer.length === 1) {
    //     spinner.succeed(chalk.bold(`${answer.length} branch selected`));
    //     return branchDeleteConfirm(answer);
    //   } else if (availableBranches.length > 1) {
    //     spinner.succeed(chalk.bold(`${answer.length} branches selected`));
    //     return branchDeleteConfirm(answer);
    //   } else {
    //     return branchDeleteAborted(spinner);
    //   }
    // })
    .catch((error) => {
      return branchDeleteAborted(spinner);
    });
};

// 4. Enquirer step for confirming if you wish to delete selected branches
const continueBranchSelection = function() {
  return selectAnotherBranch
    .run()
    .then((answer) => {
      answer === 'Yes' ? identifyLocalBranches() : abortPush(spinner)
    })
    .catch((error) => {
      return branchDeleteAborted(spinner);
    });
};

// 4. Enquirer step for confirming if you wish to delete selected branches
const branchDeleteConfirm = function(selectedBranch, message) {
  return confirmBranchDelete
    .run()
    .then((answer) => {
      answer === 'Yes' ? deleteBranchesCommand(message) : abortPush(spinner)
    })
    .catch((error) => {
      return branchDeleteAborted(spinner);
    });
};

// Thrown when there are no available branches for deletion
function noBranchesAvailable(spinner) {
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `No additional branches found`
      )
  );
};

// Thrown when the process is aborted
function branchDeleteAborted(spinner) {
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `Aborted branch deletion`
      )
  );
};

/* -------------------
Branch Cleanup prompts
------------------- */
const listBranches = new Select({
  type: 'checkbox',
  name: 'branchList',
  message: `1/2: Select the local branches you'd like to delete (Space to select)`,
  choices: availableBranches
});

const confirmBranchDelete = new Select({
  name: 'confirmBranchDelete',
  message: `2/3: Are you sure you wish to delete this branch? This cannot be undone`,
  choices: ['Yes', 'No']
});

const selectAnotherBranch = new Select({
  name: 'selectAnotherBranch = new Select({',
  message: `3/3: Would you like to select another branch?`,
  choices: ['Yes', 'No']
});
