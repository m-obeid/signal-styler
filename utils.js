const asar = require("@electron/asar");
const fs = require("fs");
const path = require("path");
const os = require("os");

const NEW_ASAR_PATH = path.join(os.homedir(), ".cache", "signal-styled.asar");

const BACKUP_ASAR_PATH = path.join(
  os.homedir(),
  ".cache",
  "signal-original.asar"
);

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
            "Signal",
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
   * Copies the given CSS file to the correct location inside the `patchDir`.
   * @param {string} cssPath - Path to the custom stylesheet CSS file.
   */
  setStylesheet(cssPath) {
    fs.copyFileSync(
      cssPath,
      path.join(this.patchDir, "stylesheets/custom.css")
    );
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
