#!/usr/bin/env node
const program = require('commander');
const index = require('../lib/index.js');

program
  .description(`Example: gitbuddy "I fixed a bug"`)
  .option('[message]', 'Commit message')
  .option('-A, -a, --all', 'Stage all files')
  .option('-p, --push', 'Automatically push to remote repository')
  .version('2.16.14', '-v, --version')
  .action(async (message, command) => {
    if (!command || command === undefined) {
      command = message;
      await index(command);
    } else {
      await index(command);
    }
  });

program.parse(process.argv);
