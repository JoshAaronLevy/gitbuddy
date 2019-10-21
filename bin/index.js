#!/usr/bin/env node
const program = require('commander');
// const runner = require('../lib/runner.js');
const index = require('../lib/index.js');

program
  .description(`Example: gitbuddy "I fixed a bug"`)
  .option('[message]')
  .option('-c, --commit')
  .version('2.1.1', '-v, --version')
  .action(async (message, command) => {
    let commit = command.commit;
    if (!commit) {
      commit = false;
    } else {
      commit = true;
    }
    await index(message, commit);
  });

program.parse(process.argv);