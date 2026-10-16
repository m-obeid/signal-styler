# signal-styler 🎨✨

Make theming Signal Desktop easy!

Adds custom CSS to **Signal Desktop**.

> ⚠️ This tool modifies the `app.asar` of Signal Desktop.  
> Use at your own risk. Restart Signal after styling.

---

## 📦 Installation

### Option 1: Install using **npm**

This works for most platforms. Install Node.js and run:

```bash
npm install -g signal-styler
```

### Option 2: Install using **AUR**

If you use an Arch Linux (btw) based distro, you can install it from the official [Arch User Repository](https://aur.archlinux.org/packages/signal-styler/) package.

Using an AUR helper like paru, yay or trizen:

```bash
paru -S signal-styler
```

Or manually:

```bash
git clone https://aur.archlinux.org/signal-styler.git
cd signal-styler
makepkg -si
```

### Option 3: Install with **[Terra](https://terrapkg.com)**

If you are using Fedora or its derivatives, you can install it from the Terra 3rd party package repository.

```bash
# First, add the Terra Repository
sudo dnf install --nogpgcheck --repofrompath 'terra,https://repos.fyralabs.com/terra$releasever' terra-release

# Then, install with dnf
dnf install signal-styler
```

### Option 4: Run from source (**for developers**)

Only do this to test new features before releases or for contributing.

```bash
git clone https://github.com/m-obeid/signal-styler.git
cd signal-styler
npm install -g pnpm # if not working try sudo or install through your package manager
pnpm install
node . -v # run node . instead of signal-styler
```

---

## 🚀 Usage

```bash
signal-styler [options] custom.css
```

### Arguments

- `custom.css`
  Path to your custom stylesheet.

### Options

- `-a, --asar <path>`
  Path to Signal Desktop’s `app.asar` to patch.
  By default, the tool will try to locate it automatically.
  Useful if Signal is installed via **Flatpak**.

- `-t, --tray-icons <path>`
  Path to the custom tray icons folder.
  Useful if you want to override the default tray icons with your own.

  The tray icons folder should have the following structure:

  ```bash
  tray-icons
  ├── alert
  │   ├── signal-tray-icon-16x16-alert-1.png
  │   ├── signal-tray-icon-16x16-alert-2.png
  │   ├── signal-tray-icon-16x16-alert-3.png
  │   ├── signal-tray-icon-16x16-alert-4.png
  │   ├── signal-tray-icon-16x16-alert-5.png
  │   ├── signal-tray-icon-16x16-alert-6.png
  │   ├── signal-tray-icon-16x16-alert-7.png
  │   ├── signal-tray-icon-16x16-alert-8.png
  │   ├── signal-tray-icon-16x16-alert-9.png
  │   ├── signal-tray-icon-16x16-alert-9+.png
  │   ├── signal-tray-icon-256x256-alert-1.png
  │   ├── signal-tray-icon-256x256-alert-2.png
  │   ├── signal-tray-icon-256x256-alert-3.png
  │   ├── signal-tray-icon-256x256-alert-4.png
  │   ├── signal-tray-icon-256x256-alert-5.png
  │   ├── signal-tray-icon-256x256-alert-6.png
  │   ├── signal-tray-icon-256x256-alert-7.png
  │   ├── signal-tray-icon-256x256-alert-8.png
  │   ├── signal-tray-icon-256x256-alert-9.png
  │   ├── signal-tray-icon-256x256-alert-9+.png
  │   ├── signal-tray-icon-32x32-alert-1.png
  │   ├── signal-tray-icon-32x32-alert-2.png
  │   ├── signal-tray-icon-32x32-alert-3.png
  │   ├── signal-tray-icon-32x32-alert-4.png
  │   ├── signal-tray-icon-32x32-alert-5.png
  │   ├── signal-tray-icon-32x32-alert-6.png
  │   ├── signal-tray-icon-32x32-alert-7.png
  │   ├── signal-tray-icon-32x32-alert-8.png
  │   ├── signal-tray-icon-32x32-alert-9.png
  │   ├── signal-tray-icon-32x32-alert-9+.png
  │   ├── signal-tray-icon-48x48-alert-1.png
  │   ├── signal-tray-icon-48x48-alert-2.png
  │   ├── signal-tray-icon-48x48-alert-3.png
  │   ├── signal-tray-icon-48x48-alert-4.png
  │   ├── signal-tray-icon-48x48-alert-5.png
  │   ├── signal-tray-icon-48x48-alert-6.png
  │   ├── signal-tray-icon-48x48-alert-7.png
  │   ├── signal-tray-icon-48x48-alert-8.png
  │   ├── signal-tray-icon-48x48-alert-9.png
  │   └── signal-tray-icon-48x48-alert-9+.png
  └── base
      ├── signal-tray-icon-16x16-base.png
      ├── signal-tray-icon-256x256-base.png
      ├── signal-tray-icon-32x32-base.png
      └── signal-tray-icon-48x48-base.png
  ```

- `-v, --version`
  Show the version number.

---

## 🔧 Examples

Apply `my-theme.css` with auto-detected Signal path:

```bash
signal-styler my-theme.css
```

Specify the `asar` path explicitly, for example for Signal installed in userspace:

```bash
signal-styler -a ~/.var/app/org.signal.Signal/files/Signal/resources/app.asar my-style.css
```

If you get permission errors, run with `sudo`:

```bash
sudo signal-styler custom.css
```

---

## 📝 Notes

- Only tested on **Linux** for now. It could work on Windows and macOS too, but I haven't tested it.
- File a [GitHub issue](https://github.com/m-obeid/signal-styler/issues) if you run into any issues.
- The script expects Signal Desktop on Linux to be installed via **Flatpak**, if not you likely need to use `--asar` or `-a` to point to the right file.
- You can safely re-run the tool with new CSS — it will overwrite the existing stylesheet.
- Every time Signal updates, you will need to run the tool again to update the stylesheet.

---

## 🎨 Themes

signal-styler does not include any themes by default other than purple.css from the GitHub repo, which needs to be downloaded separately.

Here are some that could work (didn't test):

- [Catppuccin for Signal Desktop](https://github.com/CalfMoon/signal-desktop)
- [DDLC Yuri (wife) / Zero Two Theme](https://github.com/Foxunderground0/Signal-Themes)
- [WhatsApp Theme (why)](https://github.com/CapnSparrow/signal-desktop-themes)

To get one, you just need the CSS file, which might be named `manifest.css` or something like that.
Do not report theme issues to me, but the original author of the theme.

---

## 👨‍💻 Author

Made with ❤️ by [POCOGuy / m-obeid](https://github.com/m-obeid)

---

## 📜 License

[GPL-3.0-only](LICENSE)
