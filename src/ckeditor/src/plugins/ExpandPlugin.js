const { Plugin } = require('@ckeditor/ckeditor5-core');
const { ButtonView } = require('@ckeditor/ckeditor5-ui');

class ExpandPlugin extends Plugin {
    static get pluginName() { return 'ExpandPlugin'; }

    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add('expandEditor', locale => {
            const button = new ButtonView(locale);
            button.set({ label: '⛶ Expand', withText: true, tooltip: 'Expand Editor' });
            button.on('execute', () => {
                document.dispatchEvent(new CustomEvent('ck-expand-editor'));
            });
            return button;
        });
    }
}

module.exports = { ExpandPlugin };