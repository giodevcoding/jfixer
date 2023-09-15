#! /usr/bin/env node
import * as fs from "node:fs/promises";
import { Command } from "commander";
import { execSync } from "node:child_process";
import type { NPMPackage, PackageJSON } from "./types";
import { getFileLines, getJSFilePaths, jfixerlog } from "./util";
import { updateAvailityPackages } from "./availity";

/** The main function that is executed at the end of the file */
async function main() {
  const program = new Command();

  program
    .version("1.0.0")
    .description(
      "A tool for fixing JHipster generated files with more up-to-date packages",
    )
    .parse(process.argv);

  const projectFolder =
    program.args.length > 0 ? program.args[0] : process.cwd();
  const sourceFolder = projectFolder + "/src/";
  const packageJson = await getPackageJSON(projectFolder);

  removePackages(packageJson);
  installPackages(packageJson);

  const jsFilePaths = await getJSFilePaths(sourceFolder);
  updateJSFiles(jsFilePaths);

  jfixerlog("FINISHED");
}

async function getPackageJSON(projectFolder: string): Promise<PackageJSON> {
  try {
    const rawData = await fs.readFile(`${projectFolder}/package.json`, "utf8");
    const parsedData = JSON.parse(rawData);
    return parsedData as PackageJSON;
  } catch (err) {
    console.error(err);
    return {};
  }
}

function removePackages(packageJson: PackageJSON) {
  const allOldPackages: NPMPackage[] = [
    { name: "availity-reactstrap-validation" },
  ];

  const packagesToRemove: NPMPackage[] =
    packageJson?.dependencies == null ? allOldPackages : [];

  if (packageJson.dependencies != null) {
    const dependencyNames = Object.keys(packageJson.dependencies);
    allOldPackages.forEach((pkg) => {
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

    execSync(`npm uninstall ${packageList} --legacy-peer-deps`, {
      stdio: "inherit",
    });
  }
}

function installPackages(packageJson: PackageJSON) {
  const allNewPackages: NPMPackage[] = [
    { name: "@availity/form", version: "1.7.4" },
  ];

  const packagesToInstall: NPMPackage[] =
    packageJson?.dependencies == null ? allNewPackages : [];

  if (packageJson.dependencies != null) {
    const dependencyNames = Object.keys(packageJson.dependencies);
    allNewPackages.forEach((pkg) => {
      if (!dependencyNames.includes(pkg.name)) {
        packagesToInstall.push(pkg);
      } else if (
        pkg.version != null &&
        !packageJson.dependencies?.[pkg.name].includes(pkg.version)
      ) {
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

    execSync(`npm install ${packageList} --legacy-peer-deps`, {
      stdio: "inherit",
    });
  }
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
main();
