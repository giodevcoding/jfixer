#! /usr/bin/env node

import { glob } from "glob"
import { Command } from "commander"

async function main() {
  const program = new Command();

  program
    .version("1.0.0")
    .description("A tool for fixing JHipster generated files with more up-to-date packages")
    .parse(process.argv)

  const sourceFolder = program.args.length > 0 ? program.args[0] : process.cwd() + "/src/"

  console.log(await getJSFiles(sourceFolder))
}

async function getJSFiles (srcFolder: string) {

  const files = (await glob(srcFolder + "/**/*.{js,jsx,ts,tsx}"))  
  return files;
}

main();


