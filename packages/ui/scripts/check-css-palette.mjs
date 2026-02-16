#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const CSS_EXTENSION = ".css";
const IGNORED_FILES = new Set(["tokens.css", "src/tokens.css"]);

const RAW_COLOR_PATTERN =
  /#(?:[\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})\b|(?:rgb|rgba|hsl|hsla|oklch)\(/;

function collectCssFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(CSS_EXTENSION)) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkCssFile(absolutePath) {
  const packageRelativePath = relative(ROOT, absolutePath);
  if (IGNORED_FILES.has(packageRelativePath)) {
    return [];
  }

  const source = readFileSync(absolutePath, "utf8");
  const lines = source.split("\n");
  const violations = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes("palette-ignore-line")) {
      continue;
    }

    if (!RAW_COLOR_PATTERN.test(line)) {
      continue;
    }

    violations.push({
      file: packageRelativePath,
      line: index + 1,
      content: line.trim(),
    });
  }

  return violations;
}

function main() {
  if (!existsSync(SRC_DIR) || !statSync(SRC_DIR).isDirectory()) {
    console.log("No src directory found, palette check skipped.");
    return;
  }

  const cssFiles = collectCssFiles(SRC_DIR);
  const violations = cssFiles.flatMap((file) => checkCssFile(file));

  if (violations.length === 0) {
    console.log("CSS palette check passed: no raw color literals found.");
    return;
  }

  console.error("CSS palette check failed.");
  console.error("Use variables from tokens.css instead of raw color values.");
  console.error(
    "Add 'palette-ignore-line' on a line only when you intentionally need an exception.",
  );
  console.error("");

  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}`);
    console.error(`  ${violation.content}`);
  }

  process.exitCode = 1;
}

main();
