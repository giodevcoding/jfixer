#! /usr/bin/env node
import * as fs from "node:fs/promises";
import * as readline from "node:readline";
import { glob } from "glob";
import { Command } from "commander";
import { createReadStream } from "node:fs";

/** The main function that is executed at the end of the file */
async function main() {
  const program = new Command();

  program
    .version("1.0.0")
    .description(
      "A tool for fixing JHipster generated files with more up-to-date packages",
    )
    .parse(process.argv);

  const sourceFolder =
    program.args.length > 0 ? program.args[0] : process.cwd() + "/src/";

  const jsFilePaths = await getJSFilePaths(sourceFolder);
  updateJSFiles(jsFilePaths);
}

/**
 * Get all file paths that need to be changed
 * */
async function getJSFilePaths(srcFolder: string) {
  const files = await glob(srcFolder + "/**/*.{js,jsx,ts,tsx}");
  return files;
}

async function updateJSFiles(filePaths: string[]) {
  for (const path of filePaths) {
    try {
      const lines = await getFileLines(path);

      updateAvailityPackages(path, lines);
    } catch (err) {
      console.error(err);
    }
  }
}

async function getFileLines(path: string) {
  const linesInterface = readline.createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  const lines: string[] = [];

  for await (const line of linesInterface) {
    lines.push(line);
  }

  return lines as readonly string[];
}

/**
 * Updates availity-reactstrap-validation to @availity/form and the imported components.
 *
 * @throws NodeJS.ErrnoException
 */
function updateAvailityPackages(
  path: string,
  lines: readonly string[],
): void | never {
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
        console.log(
          "Updated availity-reactstrap-validation to @availity/form in:",
          path,
        );
      });
    })
    .catch((err: NodeJS.ErrnoException) => {
      throw err;
    });
}

main();
