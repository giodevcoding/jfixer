#! /usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs/promises"));
const readline = __importStar(require("node:readline"));
const glob_1 = require("glob");
const commander_1 = require("commander");
const node_fs_1 = require("node:fs");
/** The main function that is executed at the end of the file */
async function main() {
    const program = new commander_1.Command();
    program
        .version("1.0.0")
        .description("A tool for fixing JHipster generated files with more up-to-date packages")
        .parse(process.argv);
    const sourceFolder = program.args.length > 0 ? program.args[0] : process.cwd() + "/src/";
    const jsFilePaths = await getJSFilePaths(sourceFolder);
    updateJSFiles(jsFilePaths);
}
/**
 * Get all file paths that need to be changed
 * */
async function getJSFilePaths(srcFolder) {
    const files = await (0, glob_1.glob)(srcFolder + "/**/*.{js,jsx,ts,tsx}");
    return files;
}
async function updateJSFiles(filePaths) {
    for (const path of filePaths) {
        try {
            const lines = await getFileLines(path);
            updateAvailityPackages(path, lines);
        }
        catch (err) {
            console.error(err);
        }
    }
}
async function getFileLines(path) {
    const linesInterface = readline.createInterface({
        input: (0, node_fs_1.createReadStream)(path),
        crlfDelay: Infinity,
    });
    const lines = [];
    for await (const line of linesInterface) {
        lines.push(line);
    }
    return lines;
}
/**
 * Updates availity-reactstrap-validation to @availity/form and the imported components.
 *
 * @throws NodeJS.ErrnoException
 */
function updateAvailityPackages(path, lines) {
    const maxLines = Math.min(lines.length, 20);
    let availityLineIndex = -1;
    for (let i = 0; i < maxLines; i++) {
        const line = lines[i];
        if (line.includes("availity-reactstrap-validation")) {
            availityLineIndex = i;
            break;
        }
    }
    if (availityLineIndex === -1) {
        return;
    }
    fs.readFile(path)
        .then((data) => {
        const newData = data
            .toString()
            .replaceAll(/availity-reactstrap-validation/g, "@availity/form")
            .replaceAll(/AvFeedback/g, "Feedback")
            .replaceAll(/AvForm/g, "Form")
            .replaceAll(/AvGroup/g, "FormGroup")
            .replaceAll(/AvInput/g, "Input")
            .replaceAll(/AvField/g, "Field");
        fs.writeFile(path, newData).then(() => {
            console.log("Updated availity-reactstrap-validation to @availity/form in:", path);
        });
    })
        .catch((err) => {
        throw err;
    });
}
main();
//# sourceMappingURL=jhipster-fix.js.map