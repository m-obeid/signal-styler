#!/usr/bin/env node

// signal-styler
// Add custom CSS to Signal Desktop (Linux only for now)
// https://github.com/m-obeid/signal-styler

const { ArgumentParser } = require("argparse");
const package = require("./package.json");
const utils = require("./utils");

const parser = new ArgumentParser({
  description: package.description,
});

parser.add_argument("-v", "--version", {
  action: "version",
  version: package.version,
});

parser.add_argument("-a", "--asar", {
  type: String,
  help: "path to Signal Desktop asar to patch",
});

parser.add_argument("-t", "--tray-icons", {
  type: String,
  help: "path to custom tray icons folder",
});

parser.add_argument("custom.css", {
  type: String,
  help: "path to custom stylesheet",
});

const args = parser.parse_args();

utils.asarPath = args["asar"] || utils.assumeAsarPath();

console.log(
  `\x1b[34msignal-styler\x1b[0m \x1b[32mv${package.version}\x1b[0m - made by \x1b[35mPOCOGuy/m-obeid\x1b[0m`
);
console.log("");

if (!utils.validateAsarPath()) {
  console.error(
    `\x1b[31mError\x1b[0m: Signal Desktop asar not found automatically.\x1b[0m`
  );

  if (!args["asar"]) {
    if (process.platform === "win32" || process.platform === "darwin")
      console.info(
        "Is Signal installed in the default location? You can specify a custom asar path with the \x1b[35m-a\x1b[0m flag."
      );
    else
      console.info(
        "Is Signal installed via Flatpak? You can specify a custom asar path with the \x1b[35m-a\x1b[0m flag."
      );
  } else console.info("Is the path you specified correct?");
  process.exit(1);
}

if (utils.checkNeedsSudo() && process.getuid() !== 0) {
  console.error(
    `\x1b[31mError\x1b[0m: You need to run signal-styler using \x1b[35msudo\x1b[0m or as root because Signal Desktop asar is installed to a protected directory.`
  );
  console.info(
    "Run \x1b[35msudo signal-styler -h\x1b[0m for more information."
  );
  process.exit(1);
}

// create a temporary patchDir and buildDir
utils.createTempDirs();

console.log("\n1. Checking Signal Desktop asar ...");

const manifest = utils.getManifest();

if (!utils.isManifestModified(manifest)) {
  console.log("\n2. \x1b[32mEnabling\x1b[0m Signal-Styler ...");

  utils.patchManifest(manifest);
} else
  console.log(
    "\n2. Signal-Styler already \x1b[32menabled\x1b[0m, continue ..."
  );

console.log(
  "\n3. Installing custom CSS " +
    (args["tray-icons"] ? " and tray icons " : "") +
    "..."
);

// copy custom.css to patchDir
utils.setStylesheet(args["custom.css"]);

if (args["tray-icons"])
  utils.setTrayIcons(args["tray-icons"]);

console.log("\n4. Building Signal Desktop asar ...");

utils.build().then(() => {
  utils.install();

  // clean up
  console.log("\n5. Cleaning up ...");
  utils.cleanup();

  console.log(
    `\n\x1b[32mDone\x1b[0m! Restart Signal to see your beautiful new styles. \x1b[33m\u{1F3A8}\x1b[0m\x1b[33m\u{2728}\x1b[0m`
  );
});
