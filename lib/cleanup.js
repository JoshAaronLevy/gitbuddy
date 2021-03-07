#!/usr/bin/env node
'use strict';
const execa = require('execa');
const directory = process.cwd();
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
let spinner = null;
let httpsUrl = ``;
let sshUrl = ``;
let gitHubUrl = ``;
let currentBranch = '';
let branchList = [];
let availableBranches = [];

module.exports = async (command) => {
  // console.log(command);
  try {
    const p = await execa('git', ['remote', '-v'], {
      cwd: directory,
      all: true,
    });
    if (p.all.match(/\bgit@github.com?:\S+/gi) != null) {
      sshUrl = p.all.match(/\bgit@github.com?:\S+/gi)[0];
      gitHubUrl = sshUrl.substring(0, sshUrl.length - 4);
    } else if (p.all.match(/\bhttps?:\/\/\S+/gi) != null) {
      httpsUrl = p.all.match(/\bhttps?:\/\/\S+/gi)[0];
      gitHubUrl = httpsUrl.substring(0, httpsUrl.length - 4);
    }
  } catch (error) {
    return error;
  }
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

function noFilesStaged(spinner) {
  spinner.warn(
    chalk.yellow.bold(`ALERT! `) +
      chalk.white(
        `No files selected to stage`
      )
  );
};

const deleteBranchesCommand = async function(message, selectedBranchCount) {
  console.log(message);
  console.log(selectedBranchCount);
  // spinner = ora(
  //   `Deleting ${selectedBranchCount} branches`
  // ).start();
  // try {
  //   const p = await execa('git', ['push'], { cwd: directory, all: true });
  //   return spinner.succeed(
  //     chalk.green.bold(`SUCCESS! `) +
  //       chalk.white(
  //         `Successfully pushed "${message}" to: \n` +
  //           chalk.white.bold(`  ${gitHubUrl}`)
  //       )
  //   );
  // } catch (p_1) {
  //   if (p_1.exitCode === 128) {
  //     spinner.warn(
  //       chalk.yellow.bold(`ALERT! `) +
  //         chalk.white(
  //           `${currentBranch} branch does not exist in remote repository yet.`
  //         )
  //     );
  //     return gitPushUpstream(currentBranch);
  //   } else {
  //     spinner.fail(
  //       chalk.red.bold(`ERROR! `) +
  //         chalk.white(
  //           `Could not push to remote repository. See details below:\n` + `${p_1.all}`
  //         )
  //     );
  //   }
  // }
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
    } else if (availableBranches.length > 0) {
      spinner.succeed(chalk.bold(`${availableBranches.length} branches found`));
      return branchSelection(availableBranches);
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
  console.log(availableBranches);
  spinner = ora();
  return listBranches
    .run()
    .then((answer) => {
      if (answer.length < 1) {
        return noBranchesAvailable(spinner);
      } else {
        return branchDeleteConfirm(answer);
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
      selectedBranchCount = answer.length;
      answer === 'Yes' ? deleteBranchesCommand(message, selectedBranchCount) : abortPush(spinner)
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
  choices: availableBranches,
});

const confirmBranchDelete = new Input({
  name: 'confirmBranchDelete',
  message: `2/2: Are you sure (y/N)? This cannot be undone`
});
