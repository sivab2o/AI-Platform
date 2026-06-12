const { Plugin } = require('@ckeditor/ckeditor5-core');
const { ButtonView } = require('@ckeditor/ckeditor5-ui');

class VoicePlugin extends Plugin {
    static get pluginName() { return 'VoicePlugin'; }

    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add('voiceInput', locale => {
            const button = new ButtonView(locale);
            button.set({ label: '🎤 Voice', withText: true, tooltip: 'Voice Input' });
            let isListening = false;
            button.on('execute', () => {
                isListening = !isListening;
                button.label = isListening ? '🛑 Stop' : '🎤 Voice';
                document.dispatchEvent(new CustomEvent(isListening ? 'ck-voice-start' : 'ck-voice-stop'));
            });
            document.addEventListener('ck-voice-stopped', () => {
                isListening = false;
                button.label = '🎤 Voice';
            });
            return button;
        });
    }
}

module.exports = { VoicePlugin };