const { Plugin } = require('@ckeditor/ckeditor5-core');
const { ButtonView } = require('@ckeditor/ckeditor5-ui');

class FileUploadPlugin extends Plugin {
    static get pluginName() { return 'FileUploadPlugin'; }

    init() {
        const editor = this.editor;

        editor.ui.componentFactory.add('fileUpload', locale => {
            const button = new ButtonView(locale);
            button.set({ label: '📎 Upload', withText: true, tooltip: 'Upload File' });
            button.on('execute', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.doc,.docx,.pdf,.xlsx,.xls,.csv'; // ✅ No images
                input.style.display = 'none';
                document.body.appendChild(input);
                input.onchange = (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    document.dispatchEvent(new CustomEvent('ck-file-upload', { detail: { file } }));
                    document.body.removeChild(input);
                };
                input.click();
            });
            return button;
        });
    }
}

module.exports = { FileUploadPlugin };