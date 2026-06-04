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
      // ✅ Voices load async — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', window.speechSynthesis.getVoices().map(v => v.name));
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
        setTimeout(() => {
          const welcomeMsg = `Welcome back, ${this.guestName}! How can I help you today?`;
          this.addBotMessage(`Welcome back, ${this.guestName}! 👋 How can I help you today?`);
          this.speakReply(welcomeMsg); // ✅ Speak welcome back
          this.cdr.detectChanges();
        }, 300);

      } else {
        const res = await axios.post('http://localhost:3000/api/ai/guest/register', {
          name: this.guestName,
          email: '',
          mobile: this.guestMobile,
          ownerId: this.ownerId
        });
        this.guestId = res.data.guestId;
        this.collectingInfo = false;

        setTimeout(async () => {
          const welcomeMsg = `Welcome back, ${this.guestName}! How can I help you today?`;
          this.addBotMessage(`Welcome back, ${this.guestName}! 🎉 How can I help you today?`);
          this.speakReply(welcomeMsg); // ✅ Only first welcome speaks
          await this.loadQuickReplies();
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
    this.userMessage = question;
    await this.sendMessage();
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
            this.addBotMessage(`Welcome back, ${this.guestName}! 👋 How can I help you today?`);
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
            this.addBotMessage(`Thank you, ${this.guestName}! 🎉 How can I help you today?`);
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
          this.isVoiceMode = true; // ✅ Set voice mode
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
      utterance.pitch = 1.5; // ✅ Higher pitch for female
      utterance.volume = 1;

      // ✅ Get all voices
      const voices = this.synthesis.getVoices();
      console.log('Available voices:', voices.map((v: any) => v.name));

      // ✅ Priority female voice list
      const femaleVoice = voices.find((v: any) =>
        v.name.includes('Google UK English Female')
      ) || voices.find((v: any) =>
        v.name.includes('Samantha')
      ) || voices.find((v: any) =>
        v.name.includes('Zira')
      ) || voices.find((v: any) =>
        v.name.includes('Heera')
      ) || voices.find((v: any) =>
        v.name.toLowerCase().includes('female')
      ) || voices.find((v: any) =>
        v.name.includes('Google हिन्दी') === false &&
        v.name.includes('female')
      );

      if (femaleVoice) {
        console.log('Using voice:', femaleVoice.name);
        utterance.voice = femaleVoice;
      } else {
        console.log('No female voice found, using pitch adjustment');
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.cdr.detectChanges();
      };

      this.synthesis.speak(utterance);
    };

    // ✅ Wait for voices to load if not ready
    const voices = this.synthesis.getVoices();
    if (voices.length === 0) {
      this.synthesis.onvoiceschanged = () => {
        speak();
      };
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

      // ✅ Speak only if voice mode
      if (this.isVoiceMode) {
        this.speakReply(reply);
        this.isVoiceMode = false; // ✅ Reset after speaking
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