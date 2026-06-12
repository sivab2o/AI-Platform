const { ClassicEditor: ClassicEditorBase } = require('@ckeditor/ckeditor5-editor-classic');
const { Essentials } = require('@ckeditor/ckeditor5-essentials');
const { Bold, Italic, Underline, Strikethrough } = require('@ckeditor/ckeditor5-basic-styles');
const { Heading } = require('@ckeditor/ckeditor5-heading');
const { List } = require('@ckeditor/ckeditor5-list');
const { BlockQuote } = require('@ckeditor/ckeditor5-block-quote');
const { Table, TableToolbar } = require('@ckeditor/ckeditor5-table');
const { VoicePlugin } = require('./plugins/VoicePlugin');
const { FileUploadPlugin } = require('./plugins/FileUploadPlugin');
const { ClearPlugin } = require('./plugins/ClearPlugin');
const { ExpandPlugin } = require('./plugins/ExpandPlugin');

class ClassicEditor extends ClassicEditorBase {}

ClassicEditor.builtinPlugins = [
    Essentials,
    Bold, Italic, Underline, Strikethrough,
    Heading, List, BlockQuote,
    Table, TableToolbar,
    VoicePlugin, FileUploadPlugin, ClearPlugin, ExpandPlugin
];

ClassicEditor.defaultConfig = {
    toolbar: {
        items: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'bulletedList', 'numberedList', '|',
            'blockQuote', 'insertTable', '|',
            'undo', 'redo', '|',
            'voiceInput', 'fileUpload', 'clearContent', 'expandEditor'
        ]
    },
    language: 'en'
};

// ✅ Fix — use both exports
module.exports = ClassicEditor;
module.exports.default = ClassicEditor;