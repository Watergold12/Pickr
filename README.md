# 🎨 Pickr

A pixel-precise color picker for GNOME Shell. Click anywhere on your screen and instantly get the color in **13 professional formats** — ready to copy and paste into your workflow.

![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-50-4A86CF?logo=gnome&logoColor=white)
![License](https://img.shields.io/badge/License-GPLv3-blue.svg)

---

## ✨ Features

### 🎯 Pixel-Perfect Color Picking
- Click the **color picker icon** in the top panel to activate
- Pick **any pixel** on your screen with a single click
- Press **Escape** to cancel at any time

### 📋 13 Color Formats with One-Click Copy
Every picked color is instantly converted to all major color spaces:

| Format | Example Output |
|--------|---------------|
| **Name** | `dodgerblue` (closest CSS color) |
| **HEX** | `#1E90FF` |
| **RGB** | `rgb(30, 144, 255)` |
| **RGB Percent** | `rgb(11.76%, 56.47%, 100.00%)` |
| **HSL** | `hsl(209.60, 100.00%, 55.88%)` |
| **HSV** | `hsv(209.60, 88.24%, 100.00%)` |
| **CMYK** | `cmyk(88.24%, 43.53%, 0.00%, 0.00%)` |
| **HWB** | `hwb(209.60, 11.76%, 0.00%)` |
| **XYZ** | `XYZ(28.43, 24.14, 98.07)` |
| **CIE-L\*ab** | `lab(56.19, 4.44, -62.29)` |
| **CIE-LCh** | `lch(56.19, 62.44, 274.08)` |
| **OKLAB** | `oklab(62.37% -0.03 -0.18)` |
| **OKLCH** | `oklch(62.37% 0.19 259.30)` |

Each format row includes a **Copy** button that sends the value straight to your clipboard.

### 🖥️ Clean UI
- **Color preview swatch** with the selected color displayed in the results panel
- **Scrollable format list** — all 13 formats accessible without overwhelming the menu
- **Dismiss** button to return to the picker-ready state

### 🔍 Magnifier *(Experimental)*
- 10× zoom lens that follows your cursor while picking
- Pixel grid overlay for sub-pixel precision
- Center marker highlighting the exact pixel being sampled
- Edge-aware positioning — flips near screen borders

> **Note:** The magnifier is currently experimental and may not render on all GNOME Shell configurations. Color picking works independently of the magnifier.

---

## 📦 Installation

### From Source (Manual)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Watergold12/Pickr.git
   ```

2. **Copy the extension to your GNOME Shell extensions directory:**
   ```bash
   cp -r Pickr/color-picker-extension ~/.local/share/gnome-shell/extensions/pickr@watergold12.github.io
   ```

3. **Restart GNOME Shell:**
   - On **Xorg**: Press `Alt+F2`, type `r`, press Enter
   - On **Wayland**: Log out and log back in

4. **Enable the extension:**
   ```bash
   gnome-extensions enable pickr@watergold12.github.io
   ```

### From ZIP

1. Download the latest `pickr@watergold12.github.io.shell-extension.zip` from [Releases](https://github.com/Watergold12/Pickr/releases)
2. Install it:
   ```bash
   gnome-extensions install pickr@watergold12.github.io.shell-extension.zip
   ```
3. Restart GNOME Shell and enable the extension

---

## 🚀 Usage

1. Click the **🎨 color picker icon** in the top panel
2. Select **Pick Color** from the dropdown menu
3. Your cursor enters picking mode — click any pixel on screen
4. The results panel opens showing the color in all 13 formats
5. Click **Copy** next to any format to copy it to your clipboard
6. Click **Dismiss** to return to the ready state

**Keyboard shortcuts:**
- `Escape` — Cancel color picking

---

## 🏗️ Project Structure

```
Pickr/
├── color-picker-extension/
│   ├── metadata.json       # Extension metadata (UUID, GNOME version)
│   ├── extension.js        # Main extension logic (picker, magnifier, UI)
│   ├── colorUtils.js       # Color space conversion utilities
│   └── stylesheet.css      # Extension styles
├── README.md
└── LICENSE
```

---

## 🎨 Color Science

Pickr implements accurate color space conversions following established standards:

- **sRGB → XYZ**: IEC 61966-2-1 standard with proper gamma linearization (sRGB transfer function)
- **XYZ → CIE-Lab**: D65 illuminant reference (`95.047, 100.000, 108.883`)
- **Lab → LCh**: Polar conversion of the Lab a*/b* plane
- **sRGB → OKLAB**: Björn Ottosson's perceptual color space using the M₁·M₂ matrix transform
- **Color naming**: Nearest-neighbor match against all 148 CSS named colors via Euclidean RGB distance

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Copyright © 2026 Watergold12

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for full terms.

**In plain terms:**
- ✅ **Free to use** — personal, academic, commercial environments
- ✅ **Free to modify** — adapt it to your needs
- ✅ **Free to redistribute** — share copies with anyone
- 🔒 **Copyleft** — all derivative works must also be licensed under GPLv3 and remain free and open source
- 🔒 **Source required** — if you distribute modified versions, you must provide the source code
- 🚫 **Cannot be made proprietary** — no one may release a closed-source or paid-only version

---

## 👤 Author

**Watergold12** — [GitHub](https://github.com/Watergold12)

---

## 🙏 Acknowledgments

A special thanks to [Joseph Mawa (josephmawa)](https://github.com/josephmawa) for their work on [Bella](https://github.com/josephmawa/Bella), which served as a major inspiration for this extension.

---

<p align="center">
  Made with ❤️ for the GNOME community
</p>
