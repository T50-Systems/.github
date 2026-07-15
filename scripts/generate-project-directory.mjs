import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderProjectDirectory } from "./project-directory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULTS = {
  manifest: path.join(ROOT, "data", "public-projects.json"),
  metadata: path.join(ROOT, "data", "public-project-metadata.json"),
  output: path.join(ROOT, "PROFILE", "README.md"),
};

function parseArguments(arguments_) {
  const options = { ...DEFAULTS, check: false, dryRun: false };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--check") options.check = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (["--manifest", "--metadata", "--output"].includes(argument)) {
      const value = arguments_[index += 1];
      if (!value) throw new Error(`${argument} requires a path`);
      options[argument.slice(2)] = path.resolve(value);
    } else throw new Error(`unknown argument: ${argument}`);
  }
  if (options.check && options.dryRun) throw new Error("--check and --dry-run cannot be combined");
  return options;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function generateProjectDirectory(arguments_ = process.argv.slice(2)) {
  const options = parseArguments(arguments_);
  const rendered = renderProjectDirectory(await readJson(options.manifest), await readJson(options.metadata));

  if (options.dryRun) {
    process.stdout.write(rendered);
    return { mode: "dry-run", changed: false };
  }

  if (options.check) {
    const current = await readFile(options.output, "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error));
    if (current !== rendered) throw new Error(`${path.relative(ROOT, options.output)} has drifted; run npm run directory:generate`);
    console.log("project directory is current");
    return { mode: "check", changed: false };
  }

  const current = await readFile(options.output, "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error));
  await writeFile(options.output, rendered, "utf8");
  console.log(current === rendered ? "project directory unchanged" : "project directory generated");
  return { mode: "write", changed: current !== rendered };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateProjectDirectory().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
