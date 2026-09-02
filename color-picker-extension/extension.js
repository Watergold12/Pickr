import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

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

    _showColorResult(color) {
        // GNOME's Cogl.Color exposes red, green, blue as integers 0-255
        let r = color.red;
        let g = color.green;
        let b = color.blue;

        let hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        let rgb = `${r}, ${g}, ${b}`;

        if (!this._indicator) return;
        this._indicator.menu.removeAll();

        // 1. Color Preview and Values
        let resultItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        
        let colorPreview = new St.Widget({
            style: `background-color: ${hex}; border-radius: 4px; border: 1px solid #ccc;`,
            width: 24,
            height: 24,
            y_align: Clutter.ActorAlign.CENTER,
        });
        resultItem.add_child(colorPreview);

        let labelsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'margin-left: 12px;'
        });
        
        let hexLabel = new St.Label({
            text: `HEX: ${hex}`,
            style: 'font-weight: bold;'
        });
        let rgbLabel = new St.Label({
            text: `RGB: ${rgb}`,
            style: 'font-size: 0.9em; opacity: 0.8;'
        });

        labelsBox.add_child(hexLabel);
        labelsBox.add_child(rgbLabel);
        resultItem.add_child(labelsBox);

        this._indicator.menu.addMenuItem(resultItem);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // 2. Copy Action
        let copyItem = new PopupMenu.PopupMenuItem('Copy HEX');
        copyItem.connect('activate', () => {
            let clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, hex);
            this._buildMenu();
        });
        this._indicator.menu.addMenuItem(copyItem);

        // 3. Dismiss Action
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
