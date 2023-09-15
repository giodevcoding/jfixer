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
const node_child_process_1 = require("node:child_process");
/** The main function that is executed at the end of the file */
async function main() {
    const program = new commander_1.Command();
    program
        .version("1.0.0")
        .description("A tool for fixing JHipster generated files with more up-to-date packages")
        .parse(process.argv);
    const projectFolder = program.args.length > 0 ? program.args[0] : process.cwd();
    const sourceFolder = projectFolder + "/src/";
    const packageJson = await getPackageJSON(projectFolder);
    removePackages(packageJson);
    installPackages(packageJson);
    const jsFilePaths = await getJSFilePaths(sourceFolder);
    updateJSFiles(jsFilePaths);
    jfixerlog("FINISHED");
}
async function getPackageJSON(projectFolder) {
    try {
        const rawData = await fs.readFile(`${projectFolder}/package.json`, "utf8");
        const parsedData = JSON.parse(rawData);
        return parsedData;
    }
    catch (err) {
        console.error(err);
        return {};
    }
}
function removePackages(packageJson) {
    const allOldPackages = [
        { name: "availity-reactstrap-validation" },
    ];
    const packagesToRemove = packageJson?.dependencies == null ? allOldPackages : [];
    if (packageJson.dependencies != null) {
        const dependencyNames = Object.keys(packageJson.dependencies);
        allOldPackages.forEach((pkg) => {
            console.log(dependencyNames);
            if (dependencyNames.includes(pkg.name)) {
                packagesToRemove.push(pkg);
            }
        });
    }
    if (packagesToRemove.length > 0) {
        const packageList = packagesToRemove.reduce((allNames, pkg) => {
            return allNames.concat(pkg.name, " ");
        }, "");
        console.log("\n");
        jfixerlog("Removing packages:", packageList);
        console.log("\n");
        (0, node_child_process_1.execSync)(`npm uninstall ${packageList} --legacy-peer-deps`, {
            stdio: "inherit",
        });
    }
}
function installPackages(packageJson) {
    const allNewPackages = [
        { name: "@availity/form", version: "1.7.4" },
    ];
    const packagesToInstall = packageJson?.dependencies == null ? allNewPackages : [];
    if (packageJson.dependencies != null) {
        const dependencyNames = Object.keys(packageJson.dependencies);
        allNewPackages.forEach((pkg) => {
            if (!dependencyNames.includes(pkg.name)) {
                packagesToInstall.push(pkg);
            }
            else if (pkg.version != null &&
                !packageJson.dependencies?.[pkg.name].includes(pkg.version)) {
                packagesToInstall.push(pkg);
            }
        });
    }
    if (packagesToInstall.length > 0) {
        const packageList = packagesToInstall.reduce((allNames, pkg) => {
            return allNames.concat(pkg.name, " ");
        }, "");
        console.log("\n");
        jfixerlog("Installing packages:", packageList);
        console.log("\n");
        (0, node_child_process_1.execSync)(`npm install ${packageList} --legacy-peer-deps`, {
            stdio: "inherit",
        });
    }
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
        const initialReplacments = getInitialAvailityReplacements(data.toString());
        const withInitialValues = insertAvailityInitialValues(initialReplacments);
        const withUpdatedSubmit = updateAvailitySubmit(withInitialValues);
        const withFixedFormGroups = fixAvailityFormGroups(withUpdatedSubmit);
        fs.writeFile(path, withFixedFormGroups).then(() => {
            jfixerlog("Updated availity-reactstrap-validation to @availity/form in:", path);
        });
    })
        .catch((err) => {
        throw err;
    });
}
function getInitialAvailityReplacements(data) {
    return (data
        .replaceAll(/availity-reactstrap-validation/g, "@availity/form")
        .replaceAll(/AvFeedback/g, "Feedback")
        //.replaceAll(/AvFeedback,\s*(?=.*availity)/g, "")
        //   .replaceAll(/<AvFeedback/g, '<span className="invalid-feedback"')
        //  .replaceAll(/<\/AvFeedback.*>/g, "</span>")
        .replaceAll(/AvForm/g, "Form")
        .replaceAll(/AvGroup/g, "FormGroup")
        .replaceAll(/AvInput/g, "Input")
        .replaceAll(/AvField/g, "Field"));
}
function insertAvailityInitialValues(data) {
    const names = getAvailityFieldNames(data);
    const initialValueObjectString = getInitialValueObjectString(names);
    const newData = data
        .replace(/export/, initialValueObjectString)
        .replaceAll(/<Form\s(?!.*model)/g, "<Form initialValues={initialValues} ")
        .replaceAll(/(?<=model=\{\s?isNew\s?\?\s?){}(?=\s?:)/g, "initialValues")
        .replaceAll(/(?<=<Form.*)model/g, "initialValues");
    return newData;
}
function updateAvailitySubmit(data) {
    const newData = data.replace(/\(event,\s?errors,\s?values\)\s?=>\s?\{/, "async (values, helpers) => {\n    const errors = await helpers.validateForm(values);");
    const destructuredValuesRegex = /(?<=\(event,\s?errors,\s?){.*}/;
    const executedDestructuredRegex = destructuredValuesRegex.exec(newData);
    if (executedDestructuredRegex !== null) {
        const destructuredValuesString = executedDestructuredRegex[0];
        return newData.replace(/\(event,\s?errors,\s?\{.*\}\)\s?=>\s?\{/, `async (values, helpers) => {\n    const ${destructuredValuesString} = values;\n    const errors = await helpers.validateForm(values);`);
    }
    return newData;
}
function fixAvailityFormGroups(data) {
    let newData = data;
    const getIdRegex = /(?<=<FormGroup[\s\S]*(?:Input|Field)[^=Label]*id=")[^"]*(?="[\s\S]*<\/FormGroup)/gm;
    const formGroupRegex = /<FormGroup(?!.*for)(?=[\s\S]*[Input|Field][\s\S]*<\/FormGroup>)/m;
    const ids = data.match(getIdRegex);
    ids?.forEach((id) => {
        newData = newData.replace(formGroupRegex, `<FormGroup for="${id}" `);
    });
    return newData;
}
function getAvailityFieldNames(data) {
    const namesRegex = /(?<=name=")(?<=").*(?=")/g;
    let resultName = null;
    const names = [];
    while ((resultName = namesRegex.exec(data))) {
        if (resultName?.[0] != null) {
            names.push(resultName[0]);
        }
    }
    return names;
}
function getInitialValueObjectString(fieldNames) {
    let initialValueObjectString = "\nconst initialValues = {";
    fieldNames.forEach((name) => {
        initialValueObjectString = initialValueObjectString.concat(`\n  ${name}: null,`);
    });
    initialValueObjectString = initialValueObjectString.concat("\n}\n\nexport");
    return initialValueObjectString;
}
function jfixerlog(...input) {
    console.log("\x1b[36m", "[JFIXER]:", "\x1b[0m", ...input);
}
main();
//# sourceMappingURL=jfixer.js.map