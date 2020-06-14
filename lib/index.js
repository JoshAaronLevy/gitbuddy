#!/usr/bin/env node
'use strict'
const execa = require('execa');
const directory = process.cwd();
const { Input, Select, MultiSelect } = require('enquirer');
const ora = require('ora');
const chalk = require('chalk');
const log = require('debug')('gitbuddy');
let spinner = null;
let stageFlag = false;
let commitFlag = false;
let defaultMessage = '';
let pushFlag = false;
let unstagedFiles = [];
let stagedFiles = [];
let currentBranch = '';
let fileList;

module.exports = (command) => {
  // console.log(command);
  if (command.A && command.A === true) {
    stageFlag = true;
  }
  if (command.args.length > 0) {
    commitFlag = true;
    defaultMessage = command.args[0];
  }
  if (command.push && command.push === true) {
    pushFlag = true;
  }
  return checkStatus()
  .then(() => fileSelection())
  .then(selectedFiles => stagingCommand(selectedFiles))
  .then(() => commitMessageInput())
  // .then(message => commitCommand(message))
  .catch(error => {
    if (spinner && spinner.isSpinning) {
      spinner.fail(chalk.red.bold(`Error: `) + error.message);
    } else {
      console.error(`WARNING: No spinner in-progress.`, error)
      process.exit(-99);
    }
  })
  .then(() => {
    log('Completed steps, forcing exit...')
    process.exit(0);
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
      return unstagedFiles;
  });
};

const fileSelection = function() {
  return statusCheck.run().then(answer => {
    if (answer.length < 1) {
      return Promise.reject(Error(`Alert: No files staged for commit!`));
    } else {
      stagedFiles = answer
      return stagedFiles;
    }
  });
};

const stagingCommand = function(stagedFiles) {
  spinner = ora(`Staging ${stagedFiles.length} files...`).start();
  if (stageFlag === true) {
    stagedFiles = ['-A'];
    stagedFiles = [...stagedFiles];
  } else {
    stagedFiles = [...stagedFiles];
    console.log(stagedFiles);
  }
  return execa('git', ['add', stagedFiles], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      if (stagedFiles.length === 1) {
        spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`${stagedFiles.length} file staged`));
      } else if (stagedFiles.length > 1) {
        spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`${stagedFiles.length} files staged`));
      }
      return stagedFiles;
    }).catch((error) => {
      log('STAGING.FAIL', error);
      return Promise.reject(new Error(`Could not stage files.`));
    });
};

const commitMessageInput = function() {
  if (commitFlag === true) {
    const message = defaultMessage;
    return commitCommand(message);
  } else {
    return commitMsg.run().then(answer => {
      message = answer;
      return commitCommand(message);
    });
  }
};

const commitCommand = function(message) {
  spinner = ora(`Committing files...`).start();
  return execa('git', ['commit', '-m', `"${message.replace(/"/g, `""`)}"`], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`"${message}" successfully committed`));
      return pushConfirm(message);
    }).catch((p) => {
      console.error(p);
      return Promise.reject(new Error(`Could not commit changes.`));
    });
};

const pushConfirm = function(message) {
  if (pushFlag === true) {
    return pushCommand(message);
  } else {
    return pushCheck.run()
      .then(answer => answer === 'Yes' ? pushCommand(message) : abortPrompts(spinner))
  }
};

const pushCommand = function(message) {
  spinner = ora(`Pushing "${message}" to remote repository...`).start();
  return execa('git', ['push'], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      let gitHubUrl = p.all;
      gitHubUrl = gitHubUrl.match(/\bhttps?:\/\/\S+/gi);
      gitHubUrl = gitHubUrl.toString();
      gitHubUrl = gitHubUrl.substring(0, gitHubUrl.length - 4);
      return spinner.succeed(chalk.green.bold(`SUCCESS! `) + chalk.green(`Successfully pushed "${message}" to: \n` +
      chalk.white.bold(`  ${gitHubUrl}`)));
    }).catch((p) => {
      console.error(p);
      return Promise.reject(new Error(`Could not push to remote repository.`));
    });
};

const identifyGitBranch = function() {
  return execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: directory, all: true})
    .then((p) => {
      checkChildProcess(p);
      log('identifyGitBranch', p.all);
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

/* -------------
Enquirer prompts
------------- */
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
