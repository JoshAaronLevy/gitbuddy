#!/usr/bin/env node
const program = require('commander');
const core = require('../lib/core.js');
const cleanup = require('../lib/cleanup.js');

program
  .description(`Example: gitbuddy "I fixed a bug"`)
  .option('[message]', 'Commit message')
  .option('-A, -a, --all', 'Stage all files')
  .option('-p, --push', 'Automatically push to remote repository')
  .option('b, branch', 'Create new branch')
  .option('c, cleanup', 'Clean up branches')
  .version('2.25.25', '-v, --version')
  .action(async (message, command) => {
    if (message.cleanup === true) {
      command = message;
      await cleanup(command);
    } else if (!command || command === undefined) {
      command = message;
      await core(command);
    } else {
      await core(command);
    }
  });

program.parse(process.argv);
