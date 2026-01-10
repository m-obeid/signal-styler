const asar = require("@electron/asar");
const plist = require("plist");
const { NtExecutable, NtExecutableResource } = require("resedit");

const fs = require("fs");
const fsP = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("node:crypto");
const { execSync, spawnSync } = require("child_process");

const NEW_ASAR_PATH = path.join(os.tmpdir(), "signal-styler-styled.asar");

const BACKUP_ASAR_PATH = path.join(os.tmpdir(), "signal-styler-backup.asar");

const MODDED_MANIFEST_HEADER = `/* SIGNAL-STYLER */ @import "custom.css"; /* SIGNAL-STYLER */`;

class Utils {
  constructor() {
    this.asarPath = this.assumeAsarPath();
  }

  /**
   * Validates if the given asar path is valid.
   * @return {boolean} true if the asar path is valid, false otherwise.
   *
   * A valid asar path is one that is a file and ends with ".asar".
   */
  validateAsarPath() {
    if (!this.asarPath) return false;

    return (
      fs.existsSync(this.asarPath) &&
      this.asarPath.endsWith(".asar") &&
      fs.statSync(this.asarPath).isFile()
    );
  }

  /**
   * Checks if the asar file has root-only permissions.
   *
   * If the file has root-only permissions, it means that the user needs to run
   * signal-styler with sudo.
   *
   * @return {boolean} true if the asar file has root-only permissions, false
   *                   otherwise.
   */
  checkNeedsSudo() {
    try {
      const stats = fs.statSync(this.asarPath);
      return stats.uid === 0;
    } catch (err) {
      console.error(`Error checking file ownership: ${err.message}`);
      return true;
    }
  }

  assumeAsarPath() {
    const systemFlatpak =
      "/var/lib/flatpak/app/org.signal.Signal/current/active/files/Signal/resources/app.asar";
    const userFlatpak = path.join(
      os.homedir(),
      ".var",
      "app",
      "org.signal.Signal",
      "current",
      "active",
      "files",
      "Signal",
      "resources",
      "app.asar"
    );

    const windows =
      process.platform === "win32"
        ? path.join(
            process.env.LOCALAPPDATA,
            "Programs",
            "signal-desktop",
            "resources",
            "app.asar"
          )
        : null;

    const darwin =
      process.platform === "darwin"
        ? "/Applications/Signal.app/Contents/Resources/app.asar"
        : null;

    if (fs.existsSync(systemFlatpak)) {
      return systemFlatpak;
    } else if (fs.existsSync(userFlatpak)) {
      return userFlatpak;
    } else if (windows && fs.existsSync(windows)) {
      return windows;
    } else if (darwin && fs.existsSync(darwin)) {
      return darwin;
    } else {
      return null;
    }
  }

  /**
   * Extracts the manifest.css file from the given asar.
   * @return {string} the text content of the manifest.css file.
   */
  getManifest() {
    return asar.extractFile(this.asarPath, "stylesheets/manifest.css");
  }

  /**
   * Writes the given manifest to the correct location inside the `patchDir`
   * after prepending the `MODDED_MANIFEST_HEADER`.
   * @param {string} manifest - The text content of the manifest.css file.
   */
  patchManifest(manifest) {
    // write new manifest to patchDir

    fs.writeFileSync(
      path.join(this.patchDir, "stylesheets/manifest.css"),
      MODDED_MANIFEST_HEADER + "\n" + manifest.toString()
    );
  }

  /**
   * Copies the given custom stylesheet to the correct location inside the `patchDir`.
   * @param {string} cssPath - Path to the custom stylesheet.
   * @throws {Error} If `cssPath` is null or undefined, or if the copy operation fails.
   */
  setStylesheet(cssPath) {
    if (cssPath === null || cssPath === undefined) {
      throw new Error("cssPath cannot be null or undefined");
    }

    if (!fs.existsSync(cssPath)) {
      throw new Error(`cssPath ${cssPath} does not exist`);
    }

    try {
      fs.copyFileSync(
        cssPath,
        path.join(this.patchDir, "stylesheets/custom.css")
      );
    } catch (err) {
      throw new Error(`Failed to copy stylesheet: ${err}`);
    }
  }

  /**
   * Deletes the old tray icons directory if it exists, and then copies the
   * contents of the given tray icon directory to the correct location inside
   * `patchDir`.
   * @param {string} iconsPath - Path to the tray icon directory.
   * @throws {Error} If `iconsPath` is null or undefined, or if the delete or copy operation fails.
   */
  setTrayIcons(iconsPath) {
    if (iconsPath === null || iconsPath === undefined) {
      throw new Error("iconsPath cannot be null or undefined");
    }

    if (!fs.existsSync(iconsPath)) {
      throw new Error(`iconsPath ${iconsPath} does not exist`);
    }

    const oldIconsPath = path.join(this.patchDir, "images/tray-icons");

    try {
      if (fs.existsSync(oldIconsPath)) {
        fs.rmSync(oldIconsPath, { recursive: true });
      }

      fs.cpSync(iconsPath, oldIconsPath, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to copy tray icons: ${err}`);
    }
  }

  /**
   * Creates two temporary directories, `patchDir` and `buildDir`, and also
   * creates a "stylesheets" directory inside `patchDir`.
   *
   * The directories are created in the system's temporary directory and are
   * named "signal-styler-patch-{random}" and "signal-styler-build-{random}".
   *
   * The `patchDir` is used to store the modified manifest.css file, while the
   * `buildDir` is used to store the full modified asar file before it is built
   * into a new asar file.
   */
  createTempDirs() {
    this.patchDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "signal-styler-patch-")
    );
    this.buildDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "signal-styler-build-")
    );

    fs.mkdirSync(path.join(this.patchDir, "stylesheets"));
  }

  /**
   * Returns whether the given manifest string has been modified by
   * signal-styler. The check is done by looking for the presence of the
   * MODDED_MANIFEST_HEADER string.
   * @param {string} manifest - The text content of the manifest.css file.
   * @returns {boolean} - true if signal-styler has modified this manifest, false
   *                     otherwise.
   */
  isManifestModified(manifest) {
    return manifest.toString().startsWith(MODDED_MANIFEST_HEADER);
  }

  /**
   * Builds a new Signal Desktop asar file by first unpacking the full asar to
   * the `buildDir`, then copying the content of the `patchDir` over it, then
   * backing up the original asar by copying it to `BACKUP_ASAR_PATH`, and
   * finally building a new asar with the modified content.
   *
   * @returns {Promise<void>} - a Promise that resolves when the build is
   *                            complete.
   */
  async build() {
    // unpack full asar to buildDir
    asar.extractAll(this.asarPath, this.buildDir);

    // copy content of patchDir to buildDir
    fs.cpSync(this.patchDir, this.buildDir, { recursive: true });

    // backup original asar
    fs.copyFileSync(this.asarPath, BACKUP_ASAR_PATH);

    // build asar
    await asar.createPackage(this.buildDir, NEW_ASAR_PATH);
  }

  /**
   * Installs the new asar file that was built by copying it to the location of
   * the original asar file.
   */
  install() {
    // install new asar
    fs.copyFileSync(NEW_ASAR_PATH, this.asarPath);
  }

  /**
   * Patches the asar integrity check for the given platform.
   * Needed for macOS and Windows otherwise Signal Desktop will reject the patched asar.
   * @returns {Promise<{success: boolean, level: string, message: string}>} - A Promise that resolves to an object with the following structure:
   *   - success: boolean - true if the patch was successful, false otherwise.
   *   - level: string - "warn" if the patch was not successful and a warning message is available, or undefined otherwise.
   *   - message: string - A message explaining why the patch was not successful, or undefined if the patch was successful.
   */
  async patchAsarIntegrity() {
    const isAssumedPath = this.asarPath === this.assumeAsarPath();
    let proc, stdout, match;
    switch (process.platform) {
      case "darwin":
        // macOS makes this easier
        // Simply edit the Info.plist file and resign the app with codesign (ad-hoc)
        const appDir = isUnassumedPath
          ? this.asarPath.replace(
              "Contents/Resources/app.asar",
              ""
            )
          : false;

        if (!appDir)
          return {
            success: false,
            level: "warn",
            message: `macOS versions of Signal Desktop use asar integrity protection. Since your asar path is not the default, signal-styler can't fix it automatically.

You can fix it manually by editing the Info.plist file inside the target app bundle and resigning it with codesign (ad-hoc).
The SHA256 hash you need is shown when you run Signal from Terminal.
See https://github.com/m-obeid/signal-styler/issues/1#issuecomment-3726382244 for more information.`,
          }; // user chose custom asar path, can't patch

	// get sha256 value first
        proc = spawnSync(path.join(appDir, "Contents", "MacOS", "Signal"), [], {
            cwd: path.dirname(exePath),
            encoding: "utf8"
        });
        stdout = (proc.stdout || "") + (proc.stderr || "");
        match = stdout.match(/Integrity check failed for asar archive\s*\(\s*[a-f0-9]{64}\s+vs\s+([a-f0-9]{64})\s*\)/i);
        
        if (!match) {
            throw new Error("Could not obtain new SHA256 hash from Signal's stdout.");
        }

        const infoPlistPath = path.join(appDir, "Contents", "Info.plist");
        const infoPlist = plist.parse(fs.readFileSync(infoPlistPath, "utf8"));
        infoPlist.ElectronAsarIntegrity["Resources/app.asar"].hash =
          match[1];
        fs.writeFileSync(infoPlistPath, plist.build(infoPlist));

        // resign app with codesign
        execSync("codesign --force --deep --sign - " + appDir.replaceAll(" ", "\\ "));
        break;
      case "win32":
        // Windows uses resources inside the executable to store the hash
        // These can be edited manually using resource hacker.
        // I will use resedit for this which is unneccesarily complex ugh.

        // Get the path to the executable
        const exePath = isAssumedPath
          ? this.asarPath.replace("resources\\app.asar", "Signal.exe")
          : false;

        if (!exePath)
          return {
            success: false,
            level: "warn",
            message: `Windows versions of Signal Desktop use asar integrity protection. Since your asar path is not the default, signal-styler can't fix it automatically.

You can fix it manually by editing the resources inside the target executable using a tool like Resource Hacker.
The SHA256 hash you need is shown when you run Signal from Command Prompt.

Open your Signal.exe in Resource Hacker and uncollapse INTEGRITY to open the ELECTRONASAR entry. Override the hash with the one you need and click the Compile button (green play button or just F5). The star for ELECTRONASAR should be red now. Click the Save button to save the changes.`,
          };

        // get sha256 value first
        proc = spawnSync(exePath, [], {
            cwd: path.dirname(exePath),
            encoding: "utf8"
        });
        stdout = (proc.stdout || "") + (proc.stderr || "");
        match = stdout.match(/Integrity check failed for asar archive\s*\(\s*[a-f0-9]{64}\s+vs\s+([a-f0-9]{64})\s*\)/i);
        
        if (!match) {
            throw new Error("Could not obtain new SHA256 hash from Signal's stdout.");
        }

        async function bypassIntegrity() {
          const buffer = await fsP.readFile(exePath);
          const executable = NtExecutable.from(buffer, { ignoreCert: true });
          const resource = NtExecutableResource.from(executable);

          // The structure expected by Electron's internal integrity check
          const integrityData = [
            {
              file: "resources\\app.asar",
              alg: "SHA256",
              value: match[1],
            },
          ];

          // Logic to find and replace the existing resource rather than just pushing
          const integrityBuffer = Buffer.from(JSON.stringify(integrityData));

          // We filter out any old ELECTRONASAR entries and add the new one
          resource.entries = resource.entries.filter(
            (e) => e.id !== "ELECTRONASAR"
          );

          resource.entries.push({
            type: "INTEGRITY",
            id: "ELECTRONASAR",
            bin: integrityBuffer,
            lang: 1033, // Default English (US)
            codepage: 1200, // UTF-16
          });

          resource.outputResource(executable);
          try {
              execSync("taskkill /f /im Signal.exe", {stdio: "ignore"});
          } catch {} // fail silently
          await fsP.writeFile(exePath, Buffer.from(executable.generate()));
        }

        await bypassIntegrity();
        break;
    }

    return {
      success: true,
    };
  }

  /**
   * Removes the temporary directories and files created during the process.
   */
  cleanup() {
    // clean up

    fs.rmSync(this.patchDir, { recursive: true });
    fs.rmSync(this.buildDir, { recursive: true });
    fs.unlinkSync(NEW_ASAR_PATH);
  }
}

module.exports = new Utils();
