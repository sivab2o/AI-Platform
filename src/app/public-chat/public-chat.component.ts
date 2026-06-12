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

  collectingInfo: boolean = true;
  step: string = 'name';

  userMessage: string = '';
  messages: any[] = [];

  isTyping: boolean = false;

  showQuickReplies: boolean = false;
  quickReplies: string[] = [];
  allSuggestions: string[] = [];
  askedCount: number = 0;
  maxQuickReplies: number = 3;
  quickRepliesDismissed: boolean = false;

  // ✅ Voice variables
  isListening: boolean = false;
  isSpeaking: boolean = false;
  recognition: any;
  synthesis: any;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.ownerId = this.route.snapshot.paramMap.get('ownerId') || '';
    this.step = 'form';

    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // ✅ Check if owner exists
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

  // ✅ Submit form -> directly start chat (no language selection)
  async submitForm() {
    if (!this.guestName.trim()) {
      alert('Name is required!'); return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(this.guestMobile)) {
      alert('Please enter a valid 10-digit mobile number!'); return;
    }

    try {
      const checkRes = await axios.post('http://localhost:3000/api/ai/guest/check', {
        email: this.guestEmail,
        mobile: this.guestMobile,
        ownerId: this.ownerId
      });

      if (checkRes.data.exists) {
        // ✅ Returning user
        this.guestId = checkRes.data.guestId;
        this.collectingInfo = false;

        const convRes = await axios.get(
          `http://localhost:3000/api/ai/guest/conversations/${this.guestId}`
        );
        const data = Array.isArray(convRes.data) ? convRes.data : [];
        if (data.length > 0) {
          data.forEach((c: any) => {
            this.messages.push({ sender: 'user', text: c.message, time: this.formatTime(c.created_at) });
            this.messages.push({ sender: 'bot', text: c.reply, time: this.formatTime(c.created_at) });
          });
        }

        setTimeout(async () => {
          try {
            const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
              ownerId: this.ownerId,
              guestId: this.guestId,
              guestName: this.guestName,
              returning: true
            });
            this.addBotMessage(welcomeRes.data.reply);
          } catch (err) { console.error(err); }
          this.cdr.detectChanges();
        }, 300);

      } else {
        // ✅ New user
        const res = await axios.post('http://localhost:3000/api/ai/guest/register', {
          name: this.guestName,
          email: '',
          mobile: this.guestMobile,
          ownerId: this.ownerId
        });
        this.guestId = res.data.guestId;
        this.collectingInfo = false;

        setTimeout(async () => {
          try {
            const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
              ownerId: this.ownerId,
              guestId: this.guestId,
              guestName: this.guestName,
              returning: false
            });
            const welcomeMsg = welcomeRes.data.reply;
            this.addBotMessage(welcomeMsg);
            setTimeout(() => this.speakReply(welcomeMsg), 800);
          } catch (err) { console.error(err); }
          await this.loadQuickReplies();
          this.cdr.detectChanges();
        }, 300);
      }

      this.cdr.detectChanges();

    } catch (err) {
      alert('Something went wrong. Please try again.');
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatMessages) {
        this.chatMessages.nativeElement.scrollTop =
          this.chatMessages.nativeElement.scrollHeight;
      }
    } catch (e) { }
  }

  formatTime(dateStr: string = ''): string {
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  addBotMessage(text: string): void {
    this.messages.push({ sender: 'bot', text, time: this.formatTime() });
    this.cdr.detectChanges();
  }

  addUserMessage(text: string): void {
    this.messages.push({ sender: 'user', text, time: this.formatTime() });
    this.cdr.detectChanges();
  }

  async loadQuickReplies(): Promise<void> {
    if (this.quickRepliesDismissed) return; // ✅ Don't show again

    try {
      const res = await axios.post(
        'http://localhost:3000/api/ai/guest/suggestions',
        { ownerId: this.ownerId }
      );
      this.allSuggestions = res.data.suggestions || [];
      this.quickReplies = [...this.allSuggestions];
      this.showQuickReplies = true;
      this.askedCount = 0;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
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
      const res = await axios.post(
        'http://localhost:3000/api/ai/guest/chat',
        {
          ownerId: this.ownerId,
          guestId: this.guestId,
          guestName: this.guestName,
          message: msg
        }
      );

      const reply = res.data.reply;
      this.messages.push({ sender: 'bot', text: reply, time: this.formatTime() });

      if (this.isVoiceMode) {
        this.speakReply(reply);
        this.isVoiceMode = false;
      }
    } catch (err) {
      this.messages.push({
        sender: 'bot',
        text: '❌ Sorry, something went wrong. Please try again.',
        time: this.formatTime()
      });
    }

    this.isTyping = false;
    this.cdr.detectChanges();
  }

  async submitStep(): Promise<void> {
    if (this.step === 'name') {
      if (!this.guestName.trim()) {
        this.addBotMessage('⚠️ Name is required! Please enter your name to continue.');
        return;
      }
      this.addUserMessage(this.guestName);
      this.step = 'email';
      setTimeout(() => {
        this.addBotMessage(`Nice to meet you, ${this.guestName}! 😊 What is your email address?`);
      }, 500);
      return;
    }

    if (this.step === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!this.guestEmail.trim()) {
        this.addBotMessage('⚠️ Email is required! Please enter your email to continue.');
        return;
      }
      if (!emailRegex.test(this.guestEmail)) {
        this.addBotMessage('⚠️ Invalid email! Please enter a valid email like example@gmail.com');
        return;
      }
      this.addUserMessage(this.guestEmail);
      this.step = 'mobile';
      setTimeout(() => {
        this.addBotMessage('Great! What is your mobile number?');
      }, 500);
      return;
    }

    if (this.step === 'mobile') {
      const mobileRegex = /^[0-9]{10}$/;
      if (!this.guestMobile.trim()) {
        this.addBotMessage('⚠️ Mobile number is required! Please enter your mobile to continue.');
        return;
      }
      if (!mobileRegex.test(this.guestMobile)) {
        this.addBotMessage('⚠️ Invalid mobile number! Please enter a valid 10-digit mobile number.');
        return;
      }
      this.addUserMessage(this.guestMobile);

      try {
        const checkRes = await axios.post(
          'http://localhost:3000/api/ai/guest/check',
          { email: this.guestEmail, mobile: this.guestMobile, ownerId: this.ownerId }
        );

        if (checkRes.data.exists) {
          this.guestId = checkRes.data.guestId;
          this.collectingInfo = false;

          const convRes = await axios.get(
            `http://localhost:3000/api/ai/guest/conversations/${this.guestId}`
          );
          const data = Array.isArray(convRes.data) ? convRes.data : [];

          if (data.length > 0) {
            data.forEach((c: any) => {
              this.messages.push({ sender: 'user', text: c.message, time: this.formatTime(c.created_at) });
              this.messages.push({ sender: 'bot', text: c.reply, time: this.formatTime(c.created_at) });
            });
          }

          setTimeout(async () => {
            try {
              const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
                ownerId: this.ownerId,
                guestId: this.guestId,
                guestName: this.guestName,
                returning: true
              });
              this.addBotMessage(welcomeRes.data.reply);
            } catch (err) {
              this.addBotMessage(`Welcome back, ${this.guestName}!`);
            }
            this.cdr.detectChanges();
          }, 500);

        } else {
          const res = await axios.post(
            'http://localhost:3000/api/ai/guest/register',
            { name: this.guestName, email: this.guestEmail, mobile: this.guestMobile, ownerId: this.ownerId }
          );
          this.guestId = res.data.guestId;
          this.collectingInfo = false;

          setTimeout(async () => {
            try {
              const welcomeRes = await axios.post('http://localhost:3000/api/ai/guest/welcome', {
                ownerId: this.ownerId,
                guestId: this.guestId,
                guestName: this.guestName,
                returning: false
              });
              const welcomeMsg = welcomeRes.data.reply;
              this.addBotMessage(welcomeMsg);
              setTimeout(() => this.speakReply(welcomeMsg), 800);
            } catch (err) {
              this.addBotMessage(`Welcome, ${this.guestName}!`);
            }
            await this.loadQuickReplies();
          }, 500);
        }

      } catch (err) {
        this.addBotMessage('❌ Something went wrong. Please refresh and try again.');
      }

      this.cdr.detectChanges();
    }
  }

  startVoiceInput() {
    if (this.isListening) {
      this.stopVoiceInput();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice not supported. Please use Chrome browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach(track => track.stop());

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-IN';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.cdr.detectChanges();
        };

        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          this.userMessage = transcript;
          this.isListening = false;
          this.isVoiceMode = true;
          this.cdr.detectChanges();
          setTimeout(() => this.sendMessage(), 300);
        };

        this.recognition.onerror = (event: any) => {
          console.error('Voice error:', event.error);
          this.isListening = false;
          this.cdr.detectChanges();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.cdr.detectChanges();
        };

        this.recognition.start();
      })
      .catch(() => {
        alert('Microphone permission denied. Please allow microphone access and try again.');
      });
  }

  stopVoiceInput() {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.cdr.detectChanges();
  }

  speakReply(text: string) {
    if (!this.synthesis) return;

    this.synthesis.cancel();

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1.5;
      utterance.volume = 1;

      const voices = this.synthesis.getVoices();

      const femaleVoice = voices.find((v: any) =>
        v.name.includes('Google UK English Female')
      ) || voices.find((v: any) =>
        v.name.includes('Samantha')
      ) || voices.find((v: any) =>
        v.name.includes('Zira')
      ) || voices.find((v: any) =>
        v.name.toLowerCase().includes('female')
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.cdr.detectChanges();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.cdr.detectChanges();
      };

      this.synthesis.speak(utterance);
    };

    const voices = this.synthesis.getVoices();
    if (voices.length === 0) {
      this.synthesis.onvoiceschanged = () => { speak(); };
    } else {
      speak();
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.cdr.detectChanges();
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.userMessage.trim() || this.isTyping) return;

    const msg = this.userMessage.trim();
    this.userMessage = '';

    // ✅ User typed their own message — permanently hide quick replies
    this.quickRepliesDismissed = true;
    this.showQuickReplies = false;
    this.quickReplies = [];

    this.addUserMessage(msg);
    this.isTyping = true;
    this.cdr.detectChanges();

    try {
      const res = await axios.post(
        'http://localhost:3000/api/ai/guest/chat',
        {
          ownerId: this.ownerId,
          guestId: this.guestId,
          guestName: this.guestName,
          message: msg
        }
      );

      const reply = res.data.reply;

      this.messages.push({
        sender: 'bot',
        text: reply,
        time: this.formatTime()
      });

      if (this.isVoiceMode) {
        this.speakReply(reply);
        this.isVoiceMode = false;
      }

    } catch (err) {
      this.messages.push({
        sender: 'bot',
        text: '❌ Sorry, something went wrong. Please try again.',
        time: this.formatTime()
      });
    }

    this.isTyping = false;
    this.cdr.detectChanges();
  }
}
