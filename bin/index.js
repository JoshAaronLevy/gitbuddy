#!/usr/bin/env node
const program = require('commander');
const index = require('../lib/index.js');

program
  .description(`Example: gitbuddy "I fixed a bug"`)
  .option('[message]')
  .version('2.1.1', '-v, --version')
  .action(async (message, command) => {
    console.log(command);
    console.log(message);
    await index(message, command);
  });

program.parse(process.argv);
