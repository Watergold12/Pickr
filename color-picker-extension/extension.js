import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ColorPickerExtension extends Extension {
    enable() {
        // Create a new panel menu button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        // Add a color picker/eyedropper icon to the button
        // 'color-select-symbolic' is standard for color pickers in GNOME
        let icon = new St.Icon({
            icon_name: 'color-select-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(icon);

        // Create a placeholder popup menu item for Phase 1
        let placeholderItem = new PanelMenu.PopupMenuItem('Color Picker clicked (Placeholder)');
        this._indicator.menu.addMenuItem(placeholderItem);

        // Add the indicator to the right side of the GNOME Shell panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        // Clean up the indicator when the extension is disabled
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

