const { Plugin } = require('@ckeditor/ckeditor5-core');
const { ButtonView } = require('@ckeditor/ckeditor5-ui');

class ClearPlugin extends Plugin {
    static get pluginName() { return 'ClearPlugin'; }

    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add('clearContent', locale => {
            const button = new ButtonView(locale);
            button.set({ label: '🗑️ Clear', withText: true, tooltip: 'Clear Content' });
            button.on('execute', () => {
                document.dispatchEvent(new CustomEvent('ck-clear-content'));
            });
            return button;
        });
    }
}

module.exports = { ClearPlugin };