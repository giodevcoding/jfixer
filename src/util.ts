import { glob } from "glob";
import { createReadStream } from "node:fs";
import * as readline from "node:readline";

export function jfixerlog(...input: any) {
  console.log("\x1b[36m", "[JFIXER]:", "\x1b[0m", ...input);
}

/**
 * Get all file paths that need to be changed
 * */
export async function getJSFilePaths(srcFolder: string) {
  const files = await glob(srcFolder + "/**/*.{js,jsx,ts,tsx}");
  return files;
}

export async function getFileLines(path: string) {
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
