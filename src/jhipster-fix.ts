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

  const projectFolder = program.args.length > 0 ? program.args[0] : process.cwd()
  const sourceFolder = projectFolder + "/src/";

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
      const initialReplacments = getInitialAvailityReplacements(data.toString());
      const withInitialValues = insertAvailityInitialValues(initialReplacments);
      const withUpdatedSubmit = updateAvailitySubmit(withInitialValues);

      fs.writeFile(path, withUpdatedSubmit).then(() => {
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

function getInitialAvailityReplacements(data: string): string {
  return data
    .replaceAll(/availity-reactstrap-validation/g, "@availity/form")
    .replaceAll(/AvFeedback/g, "Feedback")
    //.replaceAll(/AvFeedback,\s*(?=.*availity)/g, "")
 //   .replaceAll(/<AvFeedback/g, '<span className="invalid-feedback"')
  //  .replaceAll(/<\/AvFeedback.*>/g, "</span>")
    .replaceAll(/AvForm/g, "Form")
    .replaceAll(/AvGroup/g, "FormGroup")
    .replaceAll(/AvInput/g, "Input")
    .replaceAll(/AvField/g, "Field")
}

function insertAvailityInitialValues(data: string): string {

  const names = getAvailityFieldNames(data);
  const initialValueObjectString = getInitialValueObjectString(names);

  const newData = data
    .replace(/export/, initialValueObjectString)
    .replaceAll(/<Form\s(?!.*model)/g, "<Form initialValues={initialValues} ")
    .replaceAll(/(?<=model=\{\s?isNew\s?\?\s?){}(?=\s?:)/g, "initialValues")
    .replaceAll(/(?<=<Form.*)model/g, "initialValues")

  return newData;
}

function updateAvailitySubmit(data: string): string {
  const newData = data
    .replace(/\(event,\s?errors,\s?values\)\s?=>\s?\{/, "async (values, helpers) => {\n    const errors = await helpers.validateForm(values);");

  const destructuredValuesRegex = /(?<=\(event,\s?errors,\s?){.*}/;
  const executedDestructuredRegex = destructuredValuesRegex.exec(newData)

  if (executedDestructuredRegex !== null) {
    const destructuredValuesString = executedDestructuredRegex[0];
    return newData
      .replace(/\(event,\s?errors,\s?\{.*\}\)\s?=>\s?\{/, `async (values, helpers) => {\n    const ${destructuredValuesString} = values;\n    const errors = await helpers.validateForm(values);`);
  }

  return newData;
}

function getAvailityFieldNames(data: string): string[] {
  const namesRegex = /(?<=name=")(?<=").*(?=")/g;
  let resultName: RegExpExecArray | null = null;

  const names = [];

  while ((resultName = namesRegex.exec(data))) {
    if (resultName?.[0] != null) {
      names.push(resultName[0]);
    }
  }
  return names;
}

function getInitialValueObjectString(fieldNames: string[]): string {
  let initialValueObjectString = "\nconst initialValues = {";
  fieldNames.forEach((name) => {
    initialValueObjectString = initialValueObjectString.concat(
      `\n  ${name}: null,`,
    );
  });
  initialValueObjectString = initialValueObjectString.concat("\n}\n\nexport");

  return initialValueObjectString;
}

main();
