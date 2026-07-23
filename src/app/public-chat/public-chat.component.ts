import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import axios from 'axios';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-public-chat',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './public-chat.component.html',
  styleUrls: ['./public-chat.component.css']
})
export class PublicChatComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatMessages') chatMessages!: ElementRef;

  ownerId: string = '';
  guestName: string = '';
  guestEmail: string = '';
  guestMobile: string = '';
  guestId: string = '';

  isVoiceMode: boolean = true;

  // ✅ Language selection
  selectedLanguage: string = '';
  selectedLanguageCode: string = '';
  showLangSelect: boolean = false;

  languages = [
    { name: 'Tamil', code: 'tamil', flag: '🇮🇳', whisper: 'ta' },
    { name: 'English', code: 'english', flag: '🇬🇧', whisper: 'en' },
    { name: 'Hindi', code: 'hindi', flag: '🇮🇳', whisper: 'hi' },
    { name: 'Telugu', code: 'telugu', flag: '🇮🇳', whisper: 'te' },
    { name: 'Malayalam', code: 'malayalam', flag: '🇮🇳', whisper: 'ml' },
    { name: 'Kannada', code: 'kannada', flag: '🇮🇳', whisper: 'kn' },
  ];

  collectingInfo: boolean = true;
  formSubmitted: boolean = false;
  step: string = 'name';

  userMessage: string = '';
  messages: any[] = [];

  isTyping: boolean = false;

  showQuickReplies: boolean = false;
  quickReplies: string[] = [];
  allSuggestions: string[] = [];
  askedCount: number = 0;
  maxQuickReplies: number = 3;
  quickRepliesDismissed: boolean = true;

  // ✅ Voice variables
  isListening: boolean = false;
  isSpeaking: boolean = false;
  recognition: any;
  synthesis: any;

  selectedVoice: any = null;
  lastSpokenText: string = '';

  speechRequestId: number = 0;
  speakingWatchdog: any = null;

  micPermissionGranted: boolean = false;
  micManuallyStopped: boolean = false;

  private silenceTimer: any = null;
  private pendingTranscript: string = '';
  private readonly SILENCE_MS = 1200;

  private speechEndedAt: number = 0;
  private speechStartedAt: number = 0;
  private speakingStuckCount: number = 0;

  private get MIC_COOLDOWN_MS(): number {
    const speechDuration = this.speechStartedAt > 0
      ? Math.max(0, this.speechEndedAt - this.speechStartedAt)
      : 0;
    return Math.min(5000, Math.max(2000, 1500 + Math.floor(speechDuration / 1000) * 500));
  }

  private detectedLang: string = 'en-IN';

  // ✅ Whisper-based voice recording
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private recordingStream: MediaStream | null = null;
  private silenceDetectTimer: any = null;
  private readonly WHISPER_SILENCE_MS = 3000;

  // ✅ Track current playing audio so we can stop it
  private currentAudio: HTMLAudioElement | null = null;

  // ✅ Typewriter: text appears word-by-word while the voice speaks
  private typingInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  goToLangSelect() {
    if (!this.guestName.trim()) { alert('Name is required!'); return; }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(this.guestMobile)) { alert('Please enter a valid 10-digit mobile number!'); return; }
    this.showLangSelect = true;
  }

  selectLanguage(lang: any) {
    this.selectedLanguage = lang.code;
    this.selectedLanguageCode = lang.name;
    this.showLangSelect = false;
    this.formSubmitted = true;
    this.submitForm();
  }

  closeChat() {
    window.close();
    // Fallback if window.close() blocked
    this.collectingInfo = true;
    this.showLangSelect = true;
    this.selectedLanguage = '';
    this.messages = [];
    this.guestId = '';
    this.guestName = '';
    this.guestMobile = '';
    this.stopVoiceInput();
    this.stopCurrentAudio();
  }

  ngOnInit() {
    this.ownerId = this.route.snapshot.paramMap.get('ownerId') || '';
    this.step = 'form';

    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.loadBestVoice();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadBestVoice();
      };
    }

    axios.get(`http://localhost:3000/api/ai/owner/check/${this.ownerId}`)
      .then(res => {
        if (res.data.valid !== true) {
          this.step = 'invalid';
          this.collectingInfo = false;
          this.messages.push({
            sender: 'bot',
            text: '❌ Invalid link. This AI assistant does not exist.',
            time: this.formatTime()
          });
        }
      })
      .catch(() => {
        this.step = 'invalid';
        this.collectingInfo = false;
      });
  }

  private loadBestVoice() {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices();
    if (!voices || voices.length === 0) return;

    const femalePriority = [
      'Google UK English Female',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Zira - English (United States)',
      'Microsoft Zira',
      'Microsoft Susan - English (Great Britain)',
      'Samantha', 'Karen', 'Moira', 'Tessa', 'Veena',
    ];

    const maleNames = /\b(david|mark|george|james|richard|fred|daniel|oliver|thomas|alex|google us english)\b/i;

    let voice: any = null;

    for (const name of femalePriority) {
      voice = voices.find((v: any) => v.name === name);
      if (voice) break;
    }
    if (!voice) {
      for (const name of femalePriority) {
        voice = voices.find((v: any) => v.name.includes(name) && !maleNames.test(v.name));
        if (voice) break;
      }
    }
    if (!voice) voice = voices.find((v: any) => /female/i.test(v.name) && !maleNames.test(v.name));
    if (!voice) voice = voices.find((v: any) => v.lang.startsWith('en') && !maleNames.test(v.name));
    if (!voice) voice = voices[0];

    this.selectedVoice = voice;
  }

  private loadVoiceForLang(lang: string): any {
    if (!this.synthesis) return this.selectedVoice;
    const voices = this.synthesis.getVoices();
    if (!voices || voices.length === 0) return this.selectedVoice;

    const langCode = lang.split('-')[0];

    const femalePreference: { [key: string]: string[] } = {
      'en': ['Google UK English Female', 'Microsoft Heera', 'Microsoft Zira'],
      'hi': ['Google हिन्दी'],
      'ta': ['Google தமிழ்'],
      'te': ['Google తెలుగు'],
      'ml': ['Google മലയാളം'],
      'kn': ['Google ಕನ್ನಡ'],
      'fr': ['Google français'],
      'de': ['Google Deutsch'],
      'es': ['Google español'],
      'ja': ['Google 日本語'],
      'ko': ['Google 한국의'],
      'zh': ['Google 普通话（中国大陆）'],
    };

    const preferred = femalePreference[langCode] || [];
    for (const name of preferred) {
      const v = voices.find((v: any) => v.name === name);
      if (v) return v;
    }

    const maleNames = /\b(david|mark|george|james|richard|fred|daniel|oliver|thomas|alex|ravi|male)\b/i;
    let voice = voices.find((v: any) => v.lang === lang && !maleNames.test(v.name));
    if (!voice) voice = voices.find((v: any) => v.lang.startsWith(langCode) && !maleNames.test(v.name));
    return voice || this.selectedVoice;
  }

  private detectTextLang(text: string): string {
    if (!text) return 'en-IN';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    if (/[\u0D80-\u0DFF]/.test(text)) return 'si-LK';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar-SA';
    return 'en-IN';
  }

  private async requestMicPermissionOnce(): Promise<void> {
    if (this.micPermissionGranted) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });
      this.recordingStream = stream;
      this.micPermissionGranted = true;
      this.micManuallyStopped = false;
    } catch (err) {
      console.warn('[Voice] Mic permission was not granted:', err);
    }
  }

  async submitForm() {

    try {
      const checkRes = await axios.post('http://localhost:3000/api/ai/guest/check', {
        email: this.guestEmail, mobile: this.guestMobile, ownerId: this.ownerId
      });

      if (checkRes.data.exists) {
        this.guestId = checkRes.data.guestId;
        const convRes = await axios.get(`http://localhost:3000/api/ai/guest/conversations/${this.guestId}`);
        const data = Array.isArray(convRes.data) ? convRes.data : [];
        if (data.length > 0) {
          data.forEach((c: any) => {
            this.messages.push({ sender: 'user', text: c.message, time: this.formatTime(c.created_at) });
            this.messages.push({ sender: 'bot', text: c.reply, time: this.formatTime(c.created_at) });
          });
        }

        await this.requestMicPermissionOnce();
        this.startMicWatchdog();
        this.collectingInfo = false;
        this.cdr.detectChanges();

        // ✅ Wait for welcome message first, then start mic after it finishes
        setTimeout(async () => {
          try {
            const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
              ownerId: this.ownerId, guestId: this.guestId, guestName: this.guestName, returning: true,
              selectedLanguage: this.selectedLanguageCode
            });
            const welcomeMsg = welcomeRes.data.reply;
            this.stopCurrentAudio();
            this.addBotMessage(welcomeMsg);
            this.speakReply(welcomeMsg, async () => {
              // ✅ Mic OFF after introduction — user turns it on manually
              this.isSpeaking = false;
              this.stopVoiceInput();
              // ✅ Show PRODUCT buttons AFTER welcome finishes
              const prods = welcomeRes.data.products || [];
              if (prods.length) { this.quickReplies = prods; this.showQuickReplies = true; }
              this.cdr.detectChanges();
              setTimeout(() => this.scrollToBottom(), 100);
            }, true);   // ✅ skipVAD = true — no listening during introduction
          } catch (err) { console.error(err); }
          this.cdr.detectChanges();
        }, 300);

      } else {
        const res = await axios.post('http://localhost:3000/api/ai/guest/register', {
          name: this.guestName, email: '', mobile: this.guestMobile, ownerId: this.ownerId
        });
        this.guestId = res.data.guestId;

        await this.requestMicPermissionOnce();
        this.startMicWatchdog();
        this.collectingInfo = false;
        this.cdr.detectChanges();

        // ✅ Wait for welcome message first, then start mic after it finishes
        setTimeout(async () => {
          try {
            const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
              ownerId: this.ownerId, guestId: this.guestId, guestName: this.guestName, returning: false,
              selectedLanguage: this.selectedLanguageCode
            });
            const welcomeMsg = welcomeRes.data.reply;
            this.stopCurrentAudio();
            this.addBotMessage(welcomeMsg);
            this.speakReply(welcomeMsg, async () => {
              // ✅ Mic OFF after introduction — user turns it on manually
              this.isSpeaking = false;
              this.stopVoiceInput();
              // ✅ Show PRODUCT buttons AFTER welcome finishes
              const prods = welcomeRes.data.products || [];
              if (prods.length) { this.quickReplies = prods; this.showQuickReplies = true; }
              this.cdr.detectChanges();
              setTimeout(() => this.scrollToBottom(), 100);
            }, true);   // ✅ skipVAD = true — no listening during introduction
          } catch (err) { console.error(err); }
          this.cdr.detectChanges();
        }, 300);
      }

      this.cdr.detectChanges();
    } catch (err) {
      alert('Something went wrong. Please try again.');
    }
  }

  ngAfterViewChecked(): void { }

  scrollToBottom(): void {
    const doScroll = () => {
      try {
        const el = document.querySelector('.chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      } catch (e) { }
    };
    doScroll();
    setTimeout(doScroll, 150);   // ✅ second pass after late-rendering content
  }

  formatTime(dateStr: string = ''): string {
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

 private prepareTextForSpeech(text: string): string {
  return text.replace(
    /(?:\+91[\s-]?)?\b\d{10}\b/g,
    (phoneNumber: string) => {
      const digitsOnly = phoneNumber.replace(/\D/g, '');

      return digitsOnly;
    }
  );
}

  addBotMessage(text: string): void {
    this.messages.push({ sender: 'bot', text, time: this.formatTime() });
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  addUserMessage(text: string): void {
    this.messages.push({ sender: 'user', text, time: this.formatTime() });
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  // ✅ Typewriter helpers — text fills word-by-word while the voice speaks
  private beginTypedMessage(): any {
    const msg = { sender: 'bot', text: '', time: this.formatTime() };
    this.messages.push(msg);
    this.cdr.detectChanges();
    this.scrollToBottom();
    return msg;
  }

  private typeChunkIntoMessage(msg: any, chunkText: string, durationMs: number) {
    this.stopTypewriter();
    const words = chunkText.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0 || !msg) return;
    // ✅ Finish typing slightly before the audio chunk ends
    const interval = Math.max(80, Math.min(450, (durationMs * 0.9) / words.length));
    let i = 0;
    this.typingInterval = setInterval(() => {
      if (i < words.length && msg) {
        msg.text = msg.text ? msg.text + ' ' + words[i] : words[i];
        i++;
        this.cdr.detectChanges();
        this.scrollToBottom();
      } else {
        this.stopTypewriter();
      }
    }, interval);
  }

  private stopTypewriter() {
    if (this.typingInterval) { clearInterval(this.typingInterval); this.typingInterval = null; }
  }

  private finishTypedMessage(msg: any, fullText: string) {
    this.stopTypewriter();
    if (msg) {
      msg.text = fullText;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  async loadQuickReplies(): Promise<void> {
    if (this.quickRepliesDismissed) return;
    try {
      const res = await axios.post('http://localhost:3000/api/ai/guest/suggestions', { ownerId: this.ownerId });
      this.allSuggestions = res.data.suggestions || [];
      this.quickReplies = [...this.allSuggestions];
      this.showQuickReplies = true;
      this.askedCount = 0;
      this.cdr.detectChanges();
    } catch (err) { console.error('Error loading suggestions:', err); }
  }

  async sendQuickReply(question: string): Promise<void> {
    this.quickReplies = this.quickReplies.filter(q => q !== question);
    this.showQuickReplies = false;
    this.askedCount++;

    const msg = question;
    this.addUserMessage(msg);
    this.isTyping = true;
    this.cdr.detectChanges();

    try {
      // ✅ Always use selected language for quick replies
      const quickReplyLang = this.selectedLanguageCode ? `name:${this.selectedLanguageCode}` : this.detectTextLang(msg);
      const res = await axios.post('http://localhost:3000/api/ai/guest/chat', {
        ownerId: this.ownerId, guestId: this.guestId, guestName: this.guestName,
        message: msg, replyLang: quickReplyLang
      });
      const reply = res.data.reply;
      if (!this.micManuallyStopped) {
        // ✅ Typewriter: text appears word-by-word while the voice speaks
        this.speakReply(reply, () => this.autoStartListening(), false, true);
      } else {
        this.addBotMessage(reply);
      }
    } catch (err) {
      this.addBotMessage('❌ Sorry, something went wrong. Please try again.');
    }

    this.isTyping = false;
    this.cdr.detectChanges();
  }

  private autoStartListening() {
    if (!this.micPermissionGranted || this.micManuallyStopped) return;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;
    if (this.isSpeaking) return;

    setTimeout(() => {
      if (!this.micPermissionGranted || this.micManuallyStopped) return;
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;
      if (this.isSpeaking) return;
      this.beginRecognition();
    }, 150);
  }

  get isMicActive(): boolean {
    return this.micPermissionGranted && !this.micManuallyStopped;
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  startVoiceInput() {
    if (this.isMicActive) { this.stopVoiceInput(); return; }
    this.micManuallyStopped = false;
    if (this.recordingStream && this.recordingStream.active) {
      this.micPermissionGranted = true;
      this.beginRecognition();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      .then((stream) => {
        this.recordingStream = stream;
        this.micPermissionGranted = true;
        this.beginRecognition();
      })
      .catch(() => { alert('Microphone permission denied. Please allow microphone access and try again.'); });
  }

  private beginRecognition(force: boolean = false) {
    if (!force && this.isSpeaking) return;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;

    if (this.recordingStream && this.recordingStream.active) {
      this.startMediaRecorder(this.recordingStream);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      .then((stream) => { this.recordingStream = stream; this.startMediaRecorder(stream); })
      .catch((err) => { console.error('[Whisper] Mic access failed:', err); this.isListening = false; this.cdr.detectChanges(); });
  }

  private audioContext: any = null;
  private audioAnalyser: any = null;
  private vadSource: any = null;
  private vadInterval: any = null;
  private isSpeechActive: boolean = false;
  private speechEndTimeout: any = null;
  private micWatchdog: any = null;
  // ✅ Shared AudioContext + live mic level (voice graphic)
  private sharedAudioContext: any = null;
  micLevel: number = 0;

  private readonly SPEECH_END_SILENCE_MS = 700;

  // ✅ Adaptive VAD — learns the room's noise level
  private noiseFloor: number = 15;
  private calibrationFrames: number = 0;
  private calibrationSum: number = 0;
  private consecutiveSpeechFrames: number = 0;
  private silentFrames: number = 0;
  private whisperInFlight: boolean = false;
  private lastWhisperAt: number = 0;
  private bargeInActive: boolean = false;
  private speechStartedRecordingAt: number = 0;
  private readonly CALIBRATION_FRAMES = 10;        // first 1 second = learn noise
  private readonly SPEECH_MARGIN = 10;             // speech must be this much louder than room
  private readonly FRAMES_TO_START = 2;            // 300ms sustained sound to count as speech
  private readonly MIN_SPEECH_DURATION_MS = 300;   // ignore blips shorter than this
  private hasCalibrated: boolean = false;

  private startMediaRecorder(stream: MediaStream) {
    this.audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

    try {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 96000 });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => { this.stopVAD(); this.processAudioWithWhisper(); };
    this.mediaRecorder.onerror = (event: any) => {
      console.error('[Whisper] MediaRecorder error:', event);
      this.isListening = false; this.cdr.detectChanges();
    };

    this.mediaRecorder.start(200);
    // ✅ Safety: never record longer than 15s in one turn (only stops ITS OWN recorder)
    const recRef = this.mediaRecorder;
    setTimeout(() => {
      if (this.mediaRecorder === recRef && recRef.state === 'recording') {
        // ✅ 15s with NO speech detected — discard silently, don't process
        if (!this.isSpeechActive && this.speechStartedRecordingAt === 0) {
          this.audioChunks = [];
        }
        recRef.stop();
      }
    }, 15000);

    this.isListening = true;
    this.isSpeechActive = false;
    this.cdr.detectChanges();
    this.startVAD(stream);
    this.scrollToBottom();
  }

  private startVAD(stream: MediaStream) {
    try {
      // ✅ Reuse ONE AudioContext (Chrome limits ~6 per page — creating new each cycle kills VAD after ~8 questions)
      if (!this.sharedAudioContext || this.sharedAudioContext.state === 'closed') {
        this.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.sharedAudioContext.state === 'suspended') {
        this.sharedAudioContext.resume();
      }
      this.audioContext = this.sharedAudioContext;
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 512;
      this.audioAnalyser.smoothingTimeConstant = 0.3;

      // ✅ Disconnect previous source before creating a new one (prevents node leak)
      if (this.vadSource) { try { this.vadSource.disconnect(); } catch (e) { } }
      this.vadSource = this.audioContext.createMediaStreamSource(stream);
      this.vadSource.connect(this.audioAnalyser);

      const bufferLength = this.audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // ✅ Calibrate only ONCE (never while bot is speaking)
      if (!this.hasCalibrated && !this.isSpeaking) {
        this.calibrationFrames = 0;
        this.calibrationSum = 0;
      } else {
        this.calibrationFrames = this.CALIBRATION_FRAMES; // skip calibration, use existing noiseFloor
      }
      this.consecutiveSpeechFrames = 0;

      this.vadInterval = setInterval(() => {
        if (!this.audioAnalyser) return;
        this.audioAnalyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a: number, b: number) => a + b, 0) / bufferLength;

        // ✅ Live mic level for the voice graphic (0 to 1)
        this.micLevel = Math.min(1, Math.max(0, (avg - this.noiseFloor) / 50));


        // ✅ Phase 1: calibrate — learn this room's noise level (first 1 second)
        if (this.calibrationFrames < this.CALIBRATION_FRAMES) {
          this.calibrationFrames++;
          this.calibrationSum += avg;
          if (this.calibrationFrames === this.CALIBRATION_FRAMES) {
            this.noiseFloor = this.calibrationSum / this.CALIBRATION_FRAMES;
            this.hasCalibrated = true;
            console.log('[VAD] Room noise floor:', this.noiseFloor.toFixed(1),
              '| Speech threshold:', (this.noiseFloor + this.SPEECH_MARGIN).toFixed(1));
          }
          return;
        }

        // ✅ Slowly adapt noise floor downward if room is quieter than calibration
        if (avg < this.noiseFloor && !this.isSpeechActive) {
          this.noiseFloor = this.noiseFloor * 0.98 + avg * 0.02;
        }
        const botAudioPlaying = this.isSpeaking && this.currentAudio;
        const speechThreshold = this.noiseFloor + (botAudioPlaying ? 16 : this.SPEECH_MARGIN);
        if (avg > speechThreshold) {
          this.consecutiveSpeechFrames++;

          // ✅ Require 300ms of sustained sound — filters noise blips (fixes phantom words)
          if (this.consecutiveSpeechFrames >= this.FRAMES_TO_START && !this.isSpeechActive) {
            this.isSpeechActive = true;
            this.speechStartedRecordingAt = Date.now();

            // ✅ Barge-in: stop bot when user starts talking
            if (this.isSpeaking) {
              this.speechRequestId++;
              console.log('[Barge-in] User interrupted — stopping bot');
              this.stopCurrentAudio();
              this.isSpeaking = false;
              this.speechEndedAt = Date.now();
              this.stopVAD();
              this.bargeInActive = true;
              this.cdr.detectChanges();
              this.beginRecognition(true);
              return;
            }
          }
          if (this.consecutiveSpeechFrames >= 2 && this.speechEndTimeout) { clearTimeout(this.speechEndTimeout); this.speechEndTimeout = null; }
          this.silentFrames = 0;

        } else {
          this.consecutiveSpeechFrames = 0;
          this.silentFrames++;
          if (this.isSpeechActive && this.silentFrames >= 4 && !this.speechEndTimeout) {
            this.speechEndTimeout = setTimeout(() => {
              if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
              }
            }, this.SPEECH_END_SILENCE_MS);
          }
        }
      }, 100);

    } catch (err) {
      this.silenceDetectTimer = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') this.mediaRecorder.stop();
      }, 5000);
    }
  }

  private stopVAD() {
    if (this.vadInterval) { clearInterval(this.vadInterval); this.vadInterval = null; }
    if (this.speechEndTimeout) { clearTimeout(this.speechEndTimeout); this.speechEndTimeout = null; }
    if (this.vadSource) { try { this.vadSource.disconnect(); } catch (e) { } this.vadSource = null; }
    if (this.audioAnalyser) { try { this.audioAnalyser.disconnect(); } catch (e) { } this.audioAnalyser = null; }
    if (this.audioContext) {
      // ✅ Do NOT close the shared context — just release the reference
      this.audioContext = null;
    }
    this.isSpeechActive = false;
  }

  // ✅ Watchdog: if mic should be listening but recorder died, restart it
  private startMicWatchdog() {
    if (this.micWatchdog) return;
    this.micWatchdog = setInterval(() => {
      // ✅ Self-heal: isSpeaking stuck true with no audio actually playing → reset
      if (this.isSpeaking && !this.currentAudio) {
        this.speakingStuckCount = (this.speakingStuckCount || 0) + 1;
        if (this.speakingStuckCount >= 2) {   // stuck for ~6 seconds
          console.log('[Watchdog] isSpeaking stuck — force reset');
          this.isSpeaking = false;
          this.speakingStuckCount = 0;
        }
      } else {
        this.speakingStuckCount = 0;
      }
      const shouldBeListening = this.micPermissionGranted && !this.micManuallyStopped
        && !this.isSpeaking && !this.isTyping;
      const isActuallyRecording = this.mediaRecorder && this.mediaRecorder.state === 'recording';
      if (shouldBeListening && !isActuallyRecording) {
        console.log('[Watchdog] Mic dead — restarting');
        this.beginRecognition();
      }
    }, 3000);
  }

  private stopMicWatchdog() {
    if (this.micWatchdog) { clearInterval(this.micWatchdog); this.micWatchdog = null; }
  }

  private startSilenceCountdown() { }
  private resetSilenceTimer() { }

  private async processAudioWithWhisper() {
    if (this.isSpeaking) { this.restartRecordingAfterDelay(); return; }
    if (this.audioChunks.length === 0) { this.restartRecordingAfterDelay(); return; }
    // ✅ Throttle: one whisper request at a time, minimum 1.5s gap
    if (this.whisperInFlight) {
      this.audioChunks = [];
      this.restartRecordingAfterDelay();
      return;
    }
    if (Date.now() - this.lastWhisperAt < 800) {
      await new Promise(r => setTimeout(r, 800));
    }
    this.whisperInFlight = true;
    this.lastWhisperAt = Date.now();

    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    this.audioChunks = [];

    // ✅ Reject noise blips — but NEVER throw away a big recording (real speech)
    const speechDuration = this.speechStartedRecordingAt > 0
      ? Date.now() - this.speechStartedRecordingAt - this.SPEECH_END_SILENCE_MS
      : 0;
    this.speechStartedRecordingAt = 0;
    if (speechDuration < this.MIN_SPEECH_DURATION_MS && audioBlob.size < 25000) {
      console.log('[VAD] Speech too short, ignored:', speechDuration, 'ms | size:', audioBlob.size);
      this.whisperInFlight = false;
      this.restartRecordingAfterDelay();
      return;
    }
    if (audioBlob.size < 3000) { this.whisperInFlight = false; this.restartRecordingAfterDelay(); return; }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('ownerId', this.ownerId);
      formData.append('selectedLanguage', this.selectedLanguage);

      const response = await axios.post(
        'http://localhost:3000/api/ai/guest/whisper',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const transcript = response.data.text?.trim();
      const detectedLanguage = response.data.language;

      if (!transcript) { this.restartRecordingAfterDelay(); return; }

      // ✅ Filter Whisper hallucinations (noise → fake YouTube phrases)
      const hallucinations = [
        'thanks for watching', "don't forget to subscribe", 'please subscribe',
        'thank you for watching', 'see you next time', 'like and subscribe',
        'ご視聴ありがとうございました', '字幕'
      ];

      const lower = transcript.toLowerCase();
      if (hallucinations.some(h => lower.includes(h))) {
        console.log('[Whisper] Hallucination ignored:', transcript);
        this.restartRecordingAfterDelay();
        return;
      }

      // ✅ Reject URL-like hallucinations (Whisper noise pattern)
      if (/www\.|https?:\/\/|\.com|\.uk|\.org/i.test(transcript)) {
        console.log('[Whisper] URL hallucination ignored:', transcript);
        this.restartRecordingAfterDelay();
        return;
      }

      // ✅ Reject unsupported languages (background TV noise etc.)
      const supportedLangs = ['english', 'tamil', 'hindi', 'telugu', 'malayalam', 'kannada'];
      if (detectedLanguage && !supportedLangs.includes(detectedLanguage)) {
        console.log('[Whisper] Unsupported language ignored:', detectedLanguage);
        this.restartRecordingAfterDelay();
        return;
      }

      if (this.isEcho(transcript)) { this.restartRecordingAfterDelay(); return; }

      const langMap: { [key: string]: string } = {
        'english': 'en-IN', 'tamil': 'ta-IN', 'hindi': 'hi-IN',
        'telugu': 'te-IN', 'malayalam': 'ml-IN', 'kannada': 'kn-IN',
        'french': 'fr-FR', 'german': 'de-DE', 'spanish': 'es-ES',
        'arabic': 'ar-SA', 'japanese': 'ja-JP', 'korean': 'ko-KR',
        'chinese': 'zh-CN', 'sinhala': 'si-LK', 'urdu': 'ur-PK',
      };
      this.detectedLang = langMap[detectedLanguage] || 'en-IN';

      this.userMessage = transcript;
      this.cdr.detectChanges();

      await this.sendMessageWithLang(transcript, detectedLanguage);

    } catch (err) {
      console.error('[Whisper] Transcription failed:', err);
      this.restartRecordingAfterDelay();
    } finally {
      this.whisperInFlight = false;
    }
  }

  private restartRecordingAfterDelay() {
    this.stopRecording(false);
    if (this.micPermissionGranted && !this.micManuallyStopped && !this.isSpeaking) {
      setTimeout(() => {
        if (this.micPermissionGranted && !this.micManuallyStopped && !this.isSpeaking) {
          this.beginRecognition();
        }
      }, 100);
    }
  }

  private stopRecording(killStream: boolean = false) {
    if (this.silenceDetectTimer) { clearTimeout(this.silenceDetectTimer); this.silenceDetectTimer = null; }
    this.stopVAD();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.onstop = null; this.mediaRecorder.stop(); } catch (e) { }
    }
    this.mediaRecorder = null;
    if (killStream && this.recordingStream) {
      this.recordingStream.getTracks().forEach((t: any) => t.stop());
      this.recordingStream = null;
    }
    this.isListening = false;
    this.cdr.detectChanges();
  }

  stopVoiceInput() {
    this.micManuallyStopped = true;
    this.stopRecording(true);
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    this.pendingTranscript = '';
    this.cdr.detectChanges();
  }

  private isTanglish(text: string): boolean {
    if (!text) return false;
    const t = text.toLowerCase();
    const tanglishWords = [
      'vanakkam', 'velai', 'nerum', 'enna', 'epdi', 'epaddi', 'romba', 'konjam',
      'paaru', 'seri', 'nandri', 'sollu', 'theriyum', 'theriyala', 'illai',
      'aamam', 'vanga', 'ponga', 'irukku', 'irukkinga', 'irukinga', 'iruka',
      'nalla', 'mudiyuma', 'mudiyum', 'sari', 'sariya', 'unga', 'neenga',
      'idhu', 'edhu', 'andha', 'antha', 'naan', 'naam', 'naanga', 'yaar', 'yaaru',
    ];
    return tanglishWords.some(w => t.includes(w));
  }

  private isEcho(transcript: string): boolean {
    if (!this.lastSpokenText) return false;
    const clean = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const heard = clean(transcript);
    const spoken = clean(this.lastSpokenText);
    if (!heard) return false;
    if (heard === spoken) return true;
    if (heard.length >= 4 && spoken.includes(heard)) return true;
    const heardWords = heard.split(/\s+/).filter(w => w.length > 2);
    if (heardWords.length >= 3) {
      const spokenWords = new Set(spoken.split(/\s+/));
      const overlap = heardWords.filter(w => spokenWords.has(w)).length;
      if (overlap / heardWords.length >= 0.5) return true;
    }
    return false;
  }

  // ✅ Fix 1: Stop current audio to prevent double voice
  private stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.speechRequestId++;
  }

  // ✅ Split text into chunks: first sentence separate, rest together
  private splitForTTS(text: string): string[] {
    const sentences = text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [text];
    if (sentences.length <= 1) return [text];
    const first = sentences[0].trim();
    const rest = sentences.slice(1).join(' ').trim();
    return rest ? [first, rest] : [first];
  }

  // ✅ Fetch TTS audio for one chunk
  private fetchTTS(text: string): Promise<string> {
    const language = this.selectedLanguage || 'english';
    return axios.post('http://localhost:3000/api/ai/tts', { text, language })
      .then(res => `data:audio/mp3;base64,${res.data.audioContent}`);
  }

  // ✅ Play one audio chunk, resolve when finished (with watchdog)
  private playAudioSrc(src: string, myId: number, chunkText: string, onPlayStart?: (durationMs: number) => void): Promise<void> {
    return new Promise((resolve) => {
      if (this.speechRequestId !== myId) { resolve(); return; }

      const audio = new Audio(src);
      this.currentAudio = audio;

      const watchdog = setTimeout(() => {
        this.currentAudio = null;
        resolve();
      }, Math.max(5000, chunkText.length * 100));

      audio.onended = () => {
        clearTimeout(watchdog);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        clearTimeout(watchdog);
        this.currentAudio = null;
        resolve();
      };

      audio.play().then(() => {
        // ✅ Typewriter: report the real audio duration the moment playback starts
        if (onPlayStart) {
          const durMs = (isFinite(audio.duration) && audio.duration > 0)
            ? audio.duration * 1000
            : Math.max(1500, chunkText.length * 80);
          onPlayStart(durMs);
        }
      }).catch(() => {
        clearTimeout(watchdog);
        this.currentAudio = null;
        resolve();
      });
    });
  }

async speakReply(
  text: string,
  onEnd?: () => void,
  skipVAD: boolean = false,
  typeText: boolean = false
) {

  this.stopCurrentAudio();
  this.stopTypewriter();
  this.stopRecording(false);

  // remaining existing code...
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    this.pendingTranscript = '';
    this.isListening = false;
    this.lastSpokenText = text;
    this.speechRequestId++;
    const myId = this.speechRequestId;
    this.synthesis?.cancel();

    // ✅ Typewriter: the message bubble for this reply (created when voice starts)
    let typedMsg: any = null;

    // ✅ Start VAD during bot speech to detect user interruption (skipped for intro)
    if (!skipVAD) {
      if (this.recordingStream && this.recordingStream.active) {
        this.startVAD(this.recordingStream);
      } else if (this.micPermissionGranted) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            this.recordingStream = stream;
            this.startVAD(stream);
          }).catch(() => { });
      }
    }

   try {
  // speechText is only for voice
  const chunks = this.splitForTTS(text);
  const ttsPromises = chunks.map(c => this.fetchTTS(c));

      this.isSpeaking = true;
      this.speechStartedAt = Date.now();
      this.cdr.detectChanges();

      // ✅ Play chunks in order — first chunk starts as soon as it's ready,
      // while later chunks are still being generated
      for (let i = 0; i < ttsPromises.length; i++) {
        if (this.speechRequestId !== myId) break;
        const src = await ttsPromises[i];
        if (this.speechRequestId !== myId) break;
        // ✅ Typewriter: create the empty bubble just before the voice starts
        if (typeText && !typedMsg) typedMsg = this.beginTypedMessage();
        const chunkText = chunks[i];
        await this.playAudioSrc(src, myId, chunkText, typeText ? (durMs) => {
          this.typeChunkIntoMessage(typedMsg, chunkText, durMs);
        } : undefined);
      }

      // ✅ Typewriter: ALWAYS end with the full text visible (even if interrupted)
      if (typeText) {
        if (!typedMsg) typedMsg = this.beginTypedMessage();
        this.finishTypedMessage(typedMsg, text);
      }

      // ✅ Finished all chunks (or was interrupted)
      if (this.speechRequestId === myId) {
        this.isSpeaking = false;
        this.speechEndedAt = Date.now();
        this.currentAudio = null;
        this.cdr.detectChanges();
        if (onEnd) onEnd();
      }

    } catch (err) {
      console.error('[TTS] Failed:', err);
      // ✅ Typewriter: TTS failed — still show the full text so it is never lost
      if (typeText) {
        if (!typedMsg) typedMsg = this.beginTypedMessage();
        this.finishTypedMessage(typedMsg, text);
      }
      if (this.speechRequestId === myId) {
        this.isSpeaking = false;
        this.currentAudio = null;
        this.cdr.detectChanges();
        if (onEnd) onEnd();
      }
    }
  }

  stopSpeaking() {
    this.stopCurrentAudio();
    if (this.speakingWatchdog) clearTimeout(this.speakingWatchdog);
    if (this.synthesis) this.synthesis.cancel();
    this.isSpeaking = false;
    this.speechEndedAt = Date.now();
    this.cdr.detectChanges();
    this.autoStartListening();
  }

  private pendingVoiceMsg: string = '';

  private async sendMessageWithLang(msg: string, whisperLang: string): Promise<void> {
    if (!msg.trim()) return;
    // ✅ If busy, QUEUE the message instead of dropping it
    if (this.isTyping) {
      console.log('[Queue] Busy — queuing voice message:', msg);
      this.pendingVoiceMsg = msg;
      return;
    }

    this.userMessage = '';
    this.quickRepliesDismissed = true;
    this.showQuickReplies = false;
    this.quickReplies = [];
    this.addUserMessage(msg);
    this.isTyping = true;
    this.lastSpokenText = '';
    this.cdr.detectChanges();

    // ✅ Safety: never let isTyping stay stuck more than 20s
    setTimeout(() => {
      if (this.isTyping) {
        console.log('[Safety] isTyping stuck — resetting');
        this.isTyping = false;
        this.cdr.detectChanges();
        this.autoStartListening();
      }
    }, 20000);

    const langNameMap: { [key: string]: string } = {
      'english': 'English', 'tamil': 'Tamil', 'hindi': 'Hindi',
      'telugu': 'Telugu', 'malayalam': 'Malayalam', 'kannada': 'Kannada',
      'french': 'French', 'german': 'German', 'spanish': 'Spanish',
      'arabic': 'Arabic', 'japanese': 'Japanese', 'korean': 'Korean',
      'chinese': 'Chinese', 'sinhala': 'Sinhala',
    };
    // ✅ Selected language ALWAYS wins — ignore whisperLang completely
    const replyLang = this.selectedLanguageCode ? `name:${this.selectedLanguageCode}` : 'auto';

    try {
      const res = await axios.post('http://localhost:3000/api/ai/guest/chat', {
        ownerId: this.ownerId, guestId: this.guestId, guestName: this.guestName,
        message: msg,
        replyLang: replyLang,
        whisperLang: undefined,
      });

      const reply = res.data.reply;
      this.isTyping = false;
      // ✅ Typewriter: text appears word-by-word while the voice speaks
      this.speakReply(reply, () => {
        // ✅ Send queued message if one arrived while we were busy
        if (this.pendingVoiceMsg) {
          const queued = this.pendingVoiceMsg;
          this.pendingVoiceMsg = '';
          this.sendMessageWithLang(queued, '');
        } else {
          this.restartRecordingAfterDelay();
        }
      }, false, true);
      this.cdr.detectChanges();

    } catch (err) {
      this.isTyping = false;
      this.addBotMessage('❌ Sorry, something went wrong. Please try again.');
      this.speakReply('Sorry, something went wrong.', () => this.restartRecordingAfterDelay());
      this.cdr.detectChanges();
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.userMessage.trim() || this.isTyping) return;

    const msg = this.userMessage.trim();
    this.userMessage = '';

    this.quickRepliesDismissed = true;
    this.showQuickReplies = false;
    this.quickReplies = [];
    this.addUserMessage(msg);
    this.isTyping = true;
    this.cdr.detectChanges();
    this.lastSpokenText = '';

    // ✅ Safety: never let isTyping stay stuck more than 20s
    setTimeout(() => {
      if (this.isTyping) {
        console.log('[Safety] isTyping stuck — resetting');
        this.isTyping = false;
        this.cdr.detectChanges();
        this.autoStartListening();
      }
    }, 20000);

    if (this.recognition) { try { this.recognition.stop(); } catch (e) { } this.recognition = null; }
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    this.pendingTranscript = '';

    try {
      // ✅ Detect language from typed text first, fallback to selected language
      // ✅ Always use selected language for typed messages
      const msgLang = this.selectedLanguageCode ? `name:${this.selectedLanguageCode}` : 'auto';

      const res = await axios.post('http://localhost:3000/api/ai/guest/chat', {
        ownerId: this.ownerId, guestId: this.guestId, guestName: this.guestName,
        message: msg, replyLang: msgLang
      });

      const reply = res.data.reply;
      this.isTyping = false;
      // ✅ Mic ON: typewriter text synced with voice. Mic OFF: text immediately, no voice
      if (!this.micManuallyStopped) {
        this.speakReply(reply, () => this.autoStartListening(), false, true);
      } else {
        this.addBotMessage(reply);
      }
      this.cdr.detectChanges();

    } catch (err) {
      this.addBotMessage('❌ Sorry, something went wrong. Please try again.');
      this.isTyping = false;
      this.cdr.detectChanges();
      if (!this.micManuallyStopped) {
        this.speakReply('Sorry, something went wrong. Please try again.', () => this.autoStartListening());
      }
    }
  }
}