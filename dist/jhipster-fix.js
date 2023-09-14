#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = require("glob");
const commander_1 = require("commander");
async function main() {
    const program = new commander_1.Command();
    program
        .version("1.0.0")
        .description("A tool for fixing JHipster generated files with more up-to-date packages")
        .parse(process.argv);
    const sourceFolder = program.args.length > 0 ? program.args[0] : process.cwd() + "/src/";
    console.log(await getJSFiles(sourceFolder));
}
async function getJSFiles(srcFolder) {
    const files = (await (0, glob_1.glob)(srcFolder + "/**/*.{js,jsx,ts,tsx}"));
    return files;
}
main();
//# sourceMappingURL=jhipster-fix.js.map