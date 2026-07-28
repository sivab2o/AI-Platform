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

  isVoiceMode: boolean = false;

  showFullVoiceScreen: boolean = false;
  voiceStatusText: string = '';

  // ✅ Language selection
  selectedLanguage: string = '';
  selectedLanguageCode: string = '';
  showLangSelect: boolean = false;
  businessName: string = '';
  private lastUserSpeechTime = 0;
  private processingVoice = false;
  private vadPreBuffer: Blob[] = [];
  private readonly MAX_PREBUFFER_CHUNKS = 8;

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
  private voiceConversationStarted = false;
  private isIntroPlaying = false;

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

  private pendingTranscript: string = '';
  private readonly SILENCE_MS = 1200;

  private speechEndedAt: number = 0;
  private speechStartedAt: number = 0;
  private speakingStuckCount: number = 0;

  private silenceTimer: any;



  private startSilenceDetection() {

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }


    this.silenceTimer = setTimeout(() => {


      if (
        this.mediaRecorder &&
        this.mediaRecorder.state === "recording"
      ) {

        console.log(
          "🎤 User stopped speaking"
        );


        this.mediaRecorder.stop();

      }


    }, 3500);

  }

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
        }else {
        this.businessName = res.data.business_name || 'our business';
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
          sampleRate: 48000,
          ...({
            voiceIsolation: true,
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googAutoGainControl: true,
            googHighpassFilter: true
          } as any)
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

              console.log("🔇 INTRO FINISHED - MIC WAITING FOR USER CLICK");

              this.isSpeaking = false;
              this.isListening = false;
              this.voiceStatusText = "Tap microphone";

              this.mediaRecorder = null;
              this.isSpeechActive = false;
              this.pendingTranscript = '';

              const prods = welcomeRes.data.products || [];

              console.log(welcomeRes.data, 'prods');
              

              if (prods.length) {
                this.quickReplies = prods;
                this.showQuickReplies = true;
              }

              this.cdr.detectChanges();

              setTimeout(() => this.scrollToBottom(), 100);

            }, true);
          } catch (err) { console.error(err); }
          this.cdr.detectChanges();
        }, 300);

      } else {
        const res = await axios.post('http://localhost:3000/api/ai/guest/register', {
          name: this.guestName, email: '', mobile: this.guestMobile, ownerId: this.ownerId
        });
        this.guestId = res.data.guestId;
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

              console.log("🔇 INTRO FINISHED - MIC WAITING FOR USER CLICK");

              this.isSpeaking = false;
              this.isListening = false;
              this.voiceStatusText = "Tap microphone";

              this.mediaRecorder = null;
              this.isSpeechActive = false;
              this.pendingTranscript = '';

              const prods = welcomeRes.data.products || [];

              if (prods.length) {
                this.quickReplies = prods;
                this.showQuickReplies = true;
              }

              this.cdr.detectChanges();

              setTimeout(() => this.scrollToBottom(), 100);

            }, true);
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


  const hourWords:any = {
    "1":"one",
    "2":"two",
    "3":"three",
    "4":"four",
    "5":"five",
    "6":"six",
    "7":"seven",
    "8":"eight",
    "9":"nine",
    "10":"ten",
    "11":"eleven",
    "12":"twelve"
  };


  // Convert 9 AM, 6 PM
  text = text.replace(
    /\b(\d{1,2})\s*(AM|PM|am|pm)\b/g,
    (match, hour, period) => {

      return `${hourWords[hour] || hour} ${period.toUpperCase()}`;

    }
  );


  // Convert 9:30 AM, 1:00 PM
  text = text.replace(
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b/g,
    (match, hour, minute, period) => {

      if(minute === "00"){

        return `${hourWords[hour] || hour} ${period.toUpperCase()}`;

      }

      return `${hourWords[hour] || hour} ${minute} ${period.toUpperCase()}`;

    }
  );


  return text;

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

    setTimeout(() => {
      if (!this.micPermissionGranted || this.micManuallyStopped) return;
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;
      if (this.isSpeaking) return;

      this.beginRecognition(true);

    }, 300);
  }

  get isMicActive(): boolean {
    return !!(
      this.mediaRecorder &&
      this.mediaRecorder.state === 'recording'
    );
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  startVoiceInput() {

    console.log("🎤 USER STARTED VOICE");

    this.voiceConversationStarted = true;

    this.micManuallyStopped = false;

    if (
      this.recordingStream &&
      this.recordingStream.active
    ) {

      this.beginRecognition();
      return;

    }


    navigator.mediaDevices.getUserMedia({

      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },

      video: false

    })

      .then(stream => {

        console.log("🎤 MIC READY");

        this.recordingStream = stream;

        this.micPermissionGranted = true;

        this.beginRecognition();

      })

      .catch(err => {

        console.error(
          "Mic permission failed",
          err
        );

      });

  }

  private beginRecognition(force: boolean = false) {

    console.log(
      "🎤 BEGIN RECOGNITION"
    );



    if (this.processingVoice) {

      console.log(
        "⏳ VOICE PROCESS BUSY"
      );

      return;

    }



    if (!force && this.isSpeaking) {

      console.log(
        "⛔ AI SPEAKING"
      );

      return;

    }



    if (
      this.mediaRecorder &&
      this.mediaRecorder.state === "recording"
    ) {

      console.log(
        "🎙️ ALREADY RECORDING"
      );

      return;

    }




    if (
      this.recordingStream &&
      this.recordingStream.active
    ) {

      this.startMediaRecorder(
        this.recordingStream
      );

      return;

    }




    navigator.mediaDevices
      .getUserMedia({

        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },

        video: false

      })
      .then(stream => {


        this.recordingStream = stream;


        this.startMediaRecorder(stream);



      })
      .catch(err => {


        console.error(
          "MIC ERROR",
          err
        );


        this.isListening = false;

        this.cdr.detectChanges();


      });


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

  private readonly SPEECH_END_SILENCE_MS = 500;

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
  private readonly SPEECH_MARGIN = 18;             // speech must be this much louder than room
  private readonly FRAMES_TO_START = 2;            // 300ms sustained sound to count as speech
  private readonly MIN_SPEECH_DURATION_MS = 150;   // ignore blips shorter than this
  private hasCalibrated: boolean = false;
  private interruptBufferRecorder: MediaRecorder | null = null;
  private interruptBufferChunks: Blob[] = [];
  private interruptBufferStream: MediaStream | null = null;

  private startInterruptBuffer(stream: MediaStream) {

    console.log("🎧 INTERRUPT BUFFER STARTED");


    this.interruptBufferChunks = [];


    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';


    try {

      this.interruptBufferRecorder =
        new MediaRecorder(
          stream,
          {
            mimeType,
            audioBitsPerSecond: 48000
          }
        );


    } catch (e) {

      this.interruptBufferRecorder =
        new MediaRecorder(stream);

    }



    this.interruptBufferRecorder.ondataavailable =
      (event: any) => {


        if (event.data && event.data.size > 0) {


          this.interruptBufferChunks.push(
            event.data
          );


          // Keep only last ~2 seconds
          if (this.interruptBufferChunks.length > 10) {

            this.interruptBufferChunks.shift();

          }

        }

      };


    this.interruptBufferRecorder.start(200);

  }

  private startMediaRecorder(stream: MediaStream) {

    console.log("🎙️ START MEDIA RECORDER");

    this.audioChunks = [];

    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

    try {

      this.mediaRecorder = new MediaRecorder(
        stream,
        {
          mimeType,
          audioBitsPerSecond: 48000
        }
      );

    } catch (e) {

      this.mediaRecorder = new MediaRecorder(stream);

    }


    console.log(
      "Recorder state BEFORE:",
      this.mediaRecorder.state
    );


    this.mediaRecorder.ondataavailable = (event: any) => {

      if (event.data && event.data.size > 0) {

        this.audioChunks.push(event.data);


        // Keep last audio pieces for ChatGPT-style pre-buffer
        this.vadPreBuffer.push(event.data);


        if (this.vadPreBuffer.length > this.MAX_PREBUFFER_CHUNKS) {

          this.vadPreBuffer.shift();

        }

      }

    };


    this.mediaRecorder.onstart = () => {

      console.log(
        "✅ MEDIA RECORDER STARTED"
      );

    };


    this.mediaRecorder.onstop = async () => {


      console.log(
        "🛑 MEDIA RECORDER STOP EVENT"
      );


      console.log(
        "TOTAL CHUNKS:",
        this.audioChunks.length
      );


      if (this.whisperInFlight) {

        console.log(
          "⏳ WHISPER BUSY"
        );

        return;

      }


      await this.processAudioWithWhisper();


    };


    this.mediaRecorder.onerror = (err: any) => {

      console.error(
        "MEDIA RECORDER ERROR",
        err
      );

    };


    this.mediaRecorder.start(200);


    console.log(
      "Recorder state AFTER:",
      this.mediaRecorder.state
    );


    this.isListening = true;

    this.cdr.detectChanges();


    this.startVAD(stream);

  }

  private startVAD(stream: MediaStream) {
    if (this.vadInterval) {

      clearInterval(this.vadInterval);

    }


    try {


      if (!this.audioContext || this.audioContext.state === "closed") {

        this.audioContext =
          new (window.AudioContext || (window as any).webkitAudioContext)();

      }


      const analyser =
        this.audioContext.createAnalyser();


      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;


      const source =
        this.audioContext.createMediaStreamSource(stream);


      source.connect(analyser);


      this.audioAnalyser = analyser;


      const data =
        new Uint8Array(analyser.fftSize);



      this.isSpeechActive = false;
      this.consecutiveSpeechFrames = 0;
      this.silentFrames = 0;



      this.vadInterval = setInterval(() => {


        analyser.getByteTimeDomainData(data);


        let sum = 0;


        for (let i = 0; i < data.length; i++) {

          const value = (data[i] - 128) / 128;

          sum += value * value;

        }


        const rms =
          Math.sqrt(sum / data.length);


        const level = rms * 100;



        const SPEECH_LEVEL = 7;



        if (level > SPEECH_LEVEL) {


          this.consecutiveSpeechFrames++;

          this.silentFrames = 0;



         let speechStartFrames = 3;


// faster detection for short words
if (!this.isSpeechActive) {

    speechStartFrames = 2;

}


if(this.consecutiveSpeechFrames >= speechStartFrames){


            if (!this.isSpeechActive) {


              console.log(
                "🗣️ USER START TALKING"
              );


              if (this.isSpeaking) {


                console.log(
                  "🛑 REAL USER INTERRUPT"
                );


                // Stop AI immediately
                this.speechRequestId++;

                this.isSpeaking = false;


                try {

                  window.speechSynthesis.cancel();

                } catch (e) { }


                if (this.currentAudio) {

                  try {

                    this.currentAudio.pause();

                    this.currentAudio.currentTime = 0;

                  } catch (e) { }

                }


                this.stopCurrentAudio();



                setTimeout(() => {


                  if (
                    this.recordingStream &&
                    (
                      !this.mediaRecorder ||
                      this.mediaRecorder.state !== "recording"
                    )
                  ) {


                    console.log(
                      "🎙️ START INTERRUPTION RECORDING"
                    );


                    this.audioChunks = [
                      ...this.interruptBufferChunks
                    ];


                    this.startMediaRecorder(
                      this.recordingStream
                    );


                  }


                }, 50);



              }

              this.isSpeechActive = true;


              this.speechStartedAt = Date.now();


            }

          }


        }
        else {


          if (this.isSpeechActive) {


            this.silentFrames++;


let requiredSilence = 12;

const speechDuration =
    Date.now() - this.speechStartedAt;


// Short speech
if (speechDuration < 2000) {

    requiredSilence = 10;

}


// Medium speech
else if (speechDuration < 8000) {

    requiredSilence = 15;

}


// Long speech
else {

    requiredSilence = 20;

}


if(this.silentFrames >= requiredSilence) {


              console.log(
                "🛑 USER FINISHED TALKING"
              );

              if (
                this.mediaRecorder &&
                this.mediaRecorder.state === "recording"
              ) {

                console.log("🛑 STOP USER AUDIO SESSION");

                this.mediaRecorder.stop();

              }


              // Reset VAD completely
              this.isSpeechActive = false;
              this.consecutiveSpeechFrames = 0;
              this.silentFrames = 0;

              this.silentFrames = 0;

              this.consecutiveSpeechFrames = 0;


            }

          }


        }


      }, 100);


    }
    catch (err) {

      console.error(
        "VAD ERROR",
        err
      );

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

  private restartRecordingAfterDelay() {

    setTimeout(() => {


      if (
        this.isSpeaking ||
        this.processingVoice
      ) {

        console.log(
          "⏳ WAITING"
        );

        return;

      }



      if (
        this.recordingStream &&
        this.recordingStream.active &&
        !this.mediaRecorder
      ) {

        console.log(
          "🔄 RESTART MIC"
        );


        this.beginRecognition();


      }


    }, 800);


  }

  private startMicWatchdog() {

    if (this.micWatchdog)
      return;


    this.micWatchdog = setInterval(() => {

      if (
        this.voiceConversationStarted &&
        !this.micManuallyStopped &&
        this.recordingStream &&
        this.recordingStream.active &&
        !this.mediaRecorder &&
        !this.isTyping
      ) {

        console.log(
          "🎤 Watchdog restarting mic"
        );

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

    console.log(
      "🚀 WHISPER START"
    );


    if (this.isSpeaking) {

      console.log(
        "🔇 AI SPEAKING IGNORE AUDIO"
      );

      this.audioChunks = [];

      return;

    }


    if (!this.audioChunks.length) {

      console.log(
        "🔇 NO AUDIO"
      );

      return;

    }



    const mimeType =
      this.mediaRecorder?.mimeType || 'audio/webm';



    const chunks = [
      ...this.audioChunks
    ];


    this.audioChunks = [];



    let audioBlob = new Blob(
      chunks,
      {
        type: mimeType
      }
    );



    console.log(
      "🎧 ORIGINAL AUDIO SIZE:",
      audioBlob.size
    );



    if (audioBlob.size < 1000) {

      console.log(
        "🔇 SMALL AUDIO IGNORE"
      );

      return;

    }



    try {


      const formData = new FormData();


      formData.append(
        "audio",
        audioBlob,
        "audio.webm"
      );


      formData.append(
        "ownerId",
        this.ownerId
      );


      formData.append(
        "selectedLanguage",
        this.selectedLanguage
      );



      const response = await axios.post(

        'http://localhost:3000/api/ai/guest/whisper',

        formData,

        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }

      );



      const transcript =
        response.data.text?.trim();

      console.log(
        "✅ TRANSCRIPT READY:",
        transcript
      );
      if (!transcript) {

        console.log(
          "🔇 EMPTY WHISPER RESULT"
        );

        setTimeout(() => {
          this.beginRecognition(true);
        }, 200);

        return;
      }
      const blocked = [

        "welcome",
        "thank you",
        "whatsapp marketing",
        "website development",
        "google ads",
        "meta ads"

      ];



      const lower =
        transcript.toLowerCase();

      if (
        transcript.length < 40 &&
        blocked.some(
          x => lower === x
        )
      ) {

        console.log(
          "🔇 POSSIBLE ECHO:",
          transcript
        );

        return;

      }

      console.log(
        "🚀 SENDING TO CHAT:",
        transcript
      );


      await this.sendMessageWithLang(
        transcript,
        response.data.language
      );
    }
    catch (err) {

      console.error(
        "WHISPER ERROR",
        err
      );

    }

  }

  private stopRecording(
    killStream: boolean = false
  ) {


    console.log(
      "🛑 STOP RECORDING"
    );



    if (this.silenceDetectTimer) {

      clearTimeout(
        this.silenceDetectTimer
      );

      this.silenceDetectTimer = null;

    }



    this.stopVAD();



    if (
      this.mediaRecorder &&
      this.mediaRecorder.state !== "inactive"
    ) {

      try {

        this.mediaRecorder.stop();

      }
      catch (e) { }

    }



    this.mediaRecorder = null;



    if (
      killStream &&
      this.recordingStream
    ) {

      this.recordingStream
        .getTracks()
        .forEach(
          t => t.stop()
        );


      this.recordingStream = null;

      this.micPermissionGranted = false;

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

  private isEcho(text: string): boolean {

    if (!text || !this.lastSpokenText) {
      return false;
    }


    const userText = text
      .toLowerCase()
      .trim();


    const aiText = this.lastSpokenText
      .toLowerCase()
      .trim();



    const userWords = userText.split(/\s+/);

    const aiWords = aiText.split(/\s+/);



    if (userWords.length < 5) {
      return false;
    }



    let matched = 0;


    for (const word of userWords) {

      if (
        aiWords.includes(word)
      ) {

        matched++;

      }

    }



    const matchRatio =
      matched / userWords.length;



    // Block only when almost the complete sentence
    // is copied from AI response

    if (
      matchRatio > 0.85 &&
      userWords.length > 8
    ) {

      console.log(
        "🔇 REAL ECHO BLOCKED:",
        text
      );


      return true;

    }



    return false;

  }

  // ✅ Fix 1: Stop current audio to prevent double voice
  private stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isSpeaking = false;

      console.log("🛑 AI interrupted by user");

      this.cdr.detectChanges();
    }
    this.speechRequestId++;
  }

  private formatTTSNumbers(text: string): string {

  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen"
  ];

  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety"
  ];


  function numberToWords(num:number):string {

    if(num < 20) {
      return ones[num];
    }

    if(num < 100) {
      return tens[Math.floor(num / 10)] +
        (num % 10 ? " " + ones[num % 10] : "");
    }

    if(num < 1000) {
      return ones[Math.floor(num / 100)] +
        " hundred " +
        (num % 100 ? numberToWords(num % 100) : "");
    }

    if(num < 100000) {
      return numberToWords(Math.floor(num / 1000)) +
        " thousand " +
        (num % 1000 ? numberToWords(num % 1000) : "");
    }

    return num.toString();

  }

return text.replace(
  /(?:Rs\.?|₹\s?|)(\d{1,3}(?:,\d{3})+|\d+)\s*(?:ரூபாய்|rupees)?/gi,
  (match, num)=>{

    const cleanNumber = Number(
      num.replace(/,/g, '')
    );

    if(cleanNumber >= 1000){

      return numberToWords(cleanNumber)
        .trim() + " rupees";

    }

    return match;

  }
);

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

private playAudioSrc(
  src: string,
  myId: number,
  chunkText: string,
  onPlayStart?: (durationMs: number) => void,
  onVoiceStart?: () => void
): Promise<void> {
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


  // ✅ Voice actually started
  if (onVoiceStart) {

    onVoiceStart();

  }


  // Existing typewriter timing
  if (onPlayStart) {

    const durMs =
      (isFinite(audio.duration) && audio.duration > 0)
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

    this.pendingTranscript = '';
    this.lastSpokenText = text;

    this.speechRequestId++;

    const myId = this.speechRequestId;

    let typedMsg: any = null;

    console.log(
      skipVAD
        ? "🔇 Intro voice - mic disabled"
        : "🎧 AI reply"
    );

    try {

      const chunks = this.splitForTTS(text);

      const ttsPromises: Promise<any>[] = [];

      ttsPromises.push(
        this.fetchTTS(chunks[0])
      );
      this.isSpeaking = true;


      // ✅ During AI speech:
      // Keep VAD active for interruption
      // DO NOT start MediaRecorder (prevents AI echo going to Whisper)

      if (!skipVAD && this.recordingStream) {

        console.log(
          "🎧 INTERRUPT LISTENER ACTIVE"
        );


        this.startVAD(this.recordingStream);
        this.startInterruptBuffer(this.recordingStream);

      }


      this.updateVoiceStatus();



      for (let i = 0; i < ttsPromises.length; i++) {


        if (this.speechRequestId !== myId)
          break;


       if (!ttsPromises[i]) {

  ttsPromises[i] =
    this.fetchTTS(chunks[i]);

}


const src = await ttsPromises[i];


// Start next TTS early
if (
  i + 1 < chunks.length &&
  !ttsPromises[i + 1]
) {

  ttsPromises[i + 1] =
    this.fetchTTS(chunks[i + 1]);

}


        if (typeText && !typedMsg)
          typedMsg = this.beginTypedMessage();


await this.playAudioSrc(
  src,
  myId,
  chunks[i],

  typeText
    ?
    (durMs) => {

      this.typeChunkIntoMessage(
        typedMsg,
        chunks[i],
        durMs
      );

    }
    :
    undefined,


  // Voice started callback
  () => {

    if (
      skipVAD &&
      !this.messages.some(
        m => m.text === text
      )
    ) {

      this.addBotMessage(text);

      this.cdr.detectChanges();

    }

  }

);


      }



      if (typeText) {


        if (!typedMsg)
          typedMsg = this.beginTypedMessage();


        this.finishTypedMessage(
          typedMsg,
          text
        );


      }



      if (this.speechRequestId === myId) {


        this.isSpeaking = false;

        this.updateVoiceStatus();


        if (onEnd)
          onEnd();


      }


    }

    catch (err) {


      console.error(
        "[TTS ERROR]",
        err
      );


      this.isSpeaking = false;

      this.updateVoiceStatus();


      if (onEnd)
        onEnd();


    }

  }

  stopSpeaking() {

    this.stopCurrentAudio();

    if (this.speakingWatchdog)
      clearTimeout(this.speakingWatchdog);

    if (this.synthesis)
      this.synthesis.cancel();


    this.isSpeaking = false;

    this.cdr.detectChanges();


    if (
      this.voiceConversationStarted &&
      this.micPermissionGranted
    ) {

      console.log(
        "🎤 Continue listening after interruption"
      );

      this.beginRecognition(true);

    }

  }

  private async sendMessageWithLang(
    msg: string,
    whisperLang: string
  ): Promise<void> {

    console.log(
      "💬 CHAT FUNCTION START:",
      msg
    );

    if (!msg.trim()) return;


    this.userMessage = '';
    this.showQuickReplies = false;
    this.quickReplies = [];

    this.addUserMessage(msg);

    this.isTyping = true;
    this.updateVoiceStatus();

    this.lastSpokenText = '';

    this.cdr.detectChanges();


    try {

      const replyLang =
        this.selectedLanguageCode
          ? `name:${this.selectedLanguageCode}`
          : 'auto';

      console.log(
        "🚀 CHAT API START",
        new Date().toLocaleTimeString()
      );

      const res = await axios.post(
        'http://localhost:3000/api/ai/guest/chat',
        {
          ownerId: this.ownerId,
          guestId: this.guestId,
          guestName: this.guestName,
          message: msg,
          replyLang: replyLang
        }
      );

      console.log(
        "✅ CHAT API END",
        new Date().toLocaleTimeString()
      );


      const reply = res.data.reply;


      this.isTyping = false;


      this.updateVoiceStatus();
      this.speakReply(
        reply,
        () => {

          console.log("🎧 Reply finished - restarting mic");
          console.log(
            "🔄 MIC RESTART CALLBACK FIRED"
          );

          setTimeout(() => {

            this.beginRecognition(true);

          }, 200);

        },
        false,
        true
      );


    }

    catch (err) {

      console.error(err);


      this.isTyping = false;


      this.speakReply(
        "Sorry, something went wrong.",
        () => {
          this.startVoiceInput();
        }
      );

    }


    this.cdr.detectChanges();

  }

  async sendMessage(): Promise<void> {

    if (!this.userMessage.trim()) return;


    const msg = this.userMessage.trim();

    this.userMessage = '';


    this.addUserMessage(msg);


    this.isTyping = true;

    this.updateVoiceStatus();


    try {


      const replyLang =
        this.selectedLanguageCode
          ? `name:${this.selectedLanguageCode}`
          : 'auto';



      const res = await axios.post(

        'http://localhost:3000/api/ai/guest/chat',

        {
          ownerId: this.ownerId,
          guestId: this.guestId,
          guestName: this.guestName,
          message: msg,
          replyLang: replyLang
        }

      );



      this.isTyping = false;

      this.speakReply(

        res.data.reply,

        () => {

          console.log("🎧 Reply finished - waiting for user");
          console.log(
            "🔄 MIC RESTART CALLBACK FIRED"
          );

          setTimeout(() => {

            this.beginRecognition(true);

          }, 200);

        },

        false,

        true

      );



    }

    catch (error) {

      this.isTyping = false;

      this.addBotMessage(
        "Sorry, something went wrong."
      );

    }


    this.updateVoiceStatus();

    this.cdr.detectChanges();

  }

  openVoiceMode() {

    console.log("🎤 OPEN VOICE MODE");

    this.isVoiceMode = true;
    this.showFullVoiceScreen = true;

    this.voiceStatusText = "Listening...";

    this.cdr.detectChanges();

    this.startVoiceInput();

  }

  closeVoiceMode() {

    this.showFullVoiceScreen = false;

    this.isVoiceMode = false;


    this.stopVoiceInput();


    this.voiceStatusText = '';


    this.cdr.detectChanges();

  }


  updateVoiceStatus() {


    if (this.isSpeaking) {

      this.voiceStatusText = "Speaking...";

    }

    else if (this.isTyping) {

      this.voiceStatusText = "Thinking...";

    }

    else if (this.isListening) {

      this.voiceStatusText = "Listening...";

    }

    else {

      this.voiceStatusText = "Tap microphone";

    }


    this.cdr.detectChanges();

  }
}