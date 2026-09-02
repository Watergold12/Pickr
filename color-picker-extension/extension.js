import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { ColorUtils } from './colorUtils.js';

export default class ColorPickerExtension extends Extension {
    enable() {
        // Initialize state variables
        this._indicator = null;
        this._pickColorItem = null;
        this._pickerActor = null;
        this._pickerGrab = null;
        this._startTimeoutId = null;

        // Create the panel indicator
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        
        let icon = new St.Icon({
            icon_name: 'color-select-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(icon);

        this._buildMenu();

        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    _buildMenu() {
        if (!this._indicator) return;
        this._indicator.menu.removeAll();

        this._pickColorItem = new PopupMenu.PopupMenuItem('Pick Color');
        this._pickColorItem.connect('activate', () => {
            this._startColorPick();
        });
        this._indicator.menu.addMenuItem(this._pickColorItem);
    }

    _startColorPick() {
        // Cleanup any existing picker state before starting a new one
        this._stopColorPick();

        // The popup menu is currently closing. We MUST defer our modal grab 
        // to avoid a conflict with the menu's own popModal operation.
        this._startTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._startTimeoutId = null;
            this._createPicker();
            return GLib.SOURCE_REMOVE;
        });
    }

    _createPicker() {
        // Double check state
        this._stopColorPick();

        // St.Widget with reactive: true guarantees it can receive events
        // We use a completely transparent background but it still intercepts clicks.
        // Using rgba(0,0,0,0.01) ensures the compositor doesn't optimize away hit-testing.
        this._pickerActor = new St.Widget({
            reactive: true,
            track_hover: true,
            width: global.stage.width,
            height: global.stage.height,
            style: 'background-color: rgba(0, 0, 0, 0.01);'
        });

        // 1. Intercept pointer events
        this._pickerActor.connect('button-press-event', () => {
            // Swallow press events so they don't bleed through to windows below
            return Clutter.EVENT_STOP;
        });

        this._pickerActor.connect('button-release-event', (actor, event) => {
            let [x, y] = event.get_coords();
            
            // CRITICAL: Release the grab BEFORE doing anything else
            this._stopColorPick();
            
            this._pickColorAt(x, y);
            return Clutter.EVENT_STOP;
        });

        // 2. Intercept keyboard events (Escape to cancel)
        this._pickerActor.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                // CRITICAL: Release the grab on cancellation
                this._stopColorPick();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // 3. Add to the layout
        Main.layoutManager.addChrome(this._pickerActor);
        
        // 4. Acquire exactly ONE modal grab and store the EXACT object returned
        this._pickerGrab = Main.pushModal(this._pickerActor);
        if (!this._pickerGrab) {
            // If the grab failed, cleanup immediately
            this._stopColorPick();
            return;
        }

        // 5. Force keyboard focus to our actor so Escape works
        this._pickerActor.grab_key_focus();
    }

    _stopColorPick() {
        // Idempotent cleanup function
        
        if (this._startTimeoutId) {
            GLib.source_remove(this._startTimeoutId);
            this._startTimeoutId = null;
        }

        // Release exactly the grab object we received
        if (this._pickerGrab) {
            Main.popModal(this._pickerGrab);
            this._pickerGrab = null;
        }

        // Destroy the actor
        if (this._pickerActor) {
            Main.layoutManager.removeChrome(this._pickerActor);
            this._pickerActor.destroy();
            this._pickerActor = null;
        }
    }

    _pickColorAt(x, y) {
        let screenshot = new Shell.Screenshot();
        screenshot.pick_color(Math.round(x), Math.round(y), (obj, result) => {
            try {
                let [success, color] = obj.pick_color_finish(result);
                if (success && color) {
                    this._showColorResult(color);
                }
            } catch (e) {
                console.error(`Pickr: Failed to pick color - ${e}`);
            }
        });
    }

    _createFormatRow(formatName, value) {
        let rowBox = new St.BoxLayout({
            vertical: false,
            style: 'padding: 8px 12px; border-radius: 8px; background-color: rgba(128,128,128,0.1); margin-bottom: 6px;',
            x_expand: true
        });
        
        let textCol = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        
        let formatLabel = new St.Label({
            text: formatName,
            style: 'font-size: 0.85em; opacity: 0.7; font-weight: bold; margin-bottom: 4px;'
        });
        let valueLabel = new St.Label({
            text: value,
            style: 'font-family: monospace; font-size: 1.0em;'
        });
        
        textCol.add_child(formatLabel);
        textCol.add_child(valueLabel);
        
        let copyButton = new St.Button({
            label: 'Copy',
            style_class: 'button',
            style: 'background-color: #3584E4; color: white; border-radius: 6px; padding: 4px 12px; font-size: 0.9em; font-weight: bold;',
            y_align: Clutter.ActorAlign.CENTER
        });
        copyButton.connect('clicked', () => {
            let clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, value);
            this._indicator.menu.close();
        });
        
        rowBox.add_child(textCol);
        rowBox.add_child(copyButton);
        return rowBox;
    }

    _showColorResult(color) {
        let r = color.red;
        let g = color.green;
        let b = color.blue;

        if (!this._indicator) return;
        this._indicator.menu.removeAll();

        // Preview header
        let hex = ColorUtils.toHex(r, g, b);
        let headerItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        
        let colorPreview = new St.Widget({
            style: `background-color: ${hex}; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);`,
            width: 32,
            height: 32,
            y_align: Clutter.ActorAlign.CENTER,
        });
        
        let previewLabel = new St.Label({
            text: 'Selected Color',
            style: 'font-weight: bold; margin-left: 12px;',
            y_align: Clutter.ActorAlign.CENTER,
        });
        
        headerItem.add_child(colorPreview);
        headerItem.add_child(previewLabel);
        this._indicator.menu.addMenuItem(headerItem);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Scrollable area for formats
        let scrollItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, hover: false });
        // Make the item itself expand and hold the scroll view
        scrollItem.style = 'padding: 0; margin: 0;';
        
        let scrollView = new St.ScrollView({
            style_class: 'vfade',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            style: 'max-height: 400px; padding: 8px;'
        });
        
        let scrollContent = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });
        
        // Add formats to scrollContent
        const formats = [
            { name: "Name", value: ColorUtils.getClosestColorName(r, g, b) },
            { name: "HEX", value: hex },
            { name: "RGB", value: ColorUtils.toRgb(r, g, b) },
            { name: "RGB Percent", value: ColorUtils.toRgbPercent(r, g, b) },
            { name: "HSL", value: ColorUtils.toHsl(r, g, b) },
            { name: "HSV", value: ColorUtils.toHsv(r, g, b) },
            { name: "CMYK", value: ColorUtils.toCmyk(r, g, b) },
            { name: "HWB", value: ColorUtils.toHwb(r, g, b) },
            { name: "XYZ", value: ColorUtils.toXyz(r, g, b) },
            { name: "CIE-L*ab", value: ColorUtils.toLab(r, g, b) },
            { name: "CIE-LCh", value: ColorUtils.toLch(r, g, b) },
            { name: "OKLAB", value: ColorUtils.toOklab(r, g, b) },
            { name: "OKLCH", value: ColorUtils.toOklch(r, g, b) }
        ];

        for (let fmt of formats) {
            scrollContent.add_child(this._createFormatRow(fmt.name, fmt.value));
        }

        scrollView.add_child(scrollContent);
        scrollItem.add_child(scrollView);
        this._indicator.menu.addMenuItem(scrollItem);
        
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Dismiss Action
        let resetItem = new PopupMenu.PopupMenuItem('Dismiss');
        resetItem.connect('activate', () => {
            this._buildMenu();
        });
        this._indicator.menu.addMenuItem(resetItem);

        this._indicator.menu.open();
    }

    disable() {
        // ALWAYS release grabs and clean up on disable!
        this._stopColorPick();
        
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._pickColorItem = null;
    }
}
