#!/usr/bin/env node

/* tslint:disable */
// check if we're running in dev mode
var devMode = require('fs').existsSync(`${__dirname}/../src`);
// or want to "force" running the compiled version with --compiled-build
var wantsCompiled = process.argv.indexOf('--compiled-build') >= 0;

// console.log('starting oakbarrel...');
if (wantsCompiled || !devMode) {
  // console.log('oakbarrel: production');
  // this runs from the compiled javascript source
  require(`${__dirname}/../build/cli`).run(process.argv);
} else {
  console.log('oakbarrel: devmode');
  // this runs from the typescript source (for dev only)
  // hook into ts-node so we can run typescript on the fly
  require('ts-node').register({ project: `${__dirname}/../tsconfig.json` });
  // run the CLI with the current process arguments
  require(`${__dirname}/../src/cli`).run(process.argv);
}
