import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatMessages') chatMessages!: ElementRef;

  user: any;
  userMessage: string = '';
  messages: any[] = [];
  isTyping: boolean = false;
  isLoading: boolean = false;

  constructor(private router: Router, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadConversations();
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    try {
      if (this.chatMessages) {
        this.chatMessages.nativeElement.scrollTop =
          this.chatMessages.nativeElement.scrollHeight;
      }
    } catch (e) { }
  }

  formatTime(dateStr: string): string {
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  loadConversations() {
    this.isLoading = true;

    const userId = this.user?.user_id;

    axios.get(`http://localhost:3000/api/ai/conversations/${userId}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];

        if (data.length > 0) {
          this.messages = data.flatMap((c: any) => ([
            { sender: 'user', text: c.message, time: this.formatTime(c.created_at) },
            { sender: 'bot', text: c.reply, time: this.formatTime(c.created_at) }
          ]));
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  async sendMessage() {
    if (!this.userMessage.trim() || this.isTyping) return;

    const msg = this.userMessage.trim();
    this.userMessage = '';

    this.messages.push({ sender: 'user', text: msg, time: this.formatTime('') });
    this.isTyping = true;
    this.cdr.detectChanges();

    try {
      const res = await axios.post('http://localhost:3000/api/ai/chat', {
        userId: this.user.user_id,
        message: msg
      });

      this.messages.push({ sender: 'bot', text: res.data.reply, time: this.formatTime('') });

    } catch (err) {
      this.messages.push({
        sender: 'bot',
        text: '❌ Sorry, something went wrong. Please try again.',
        time: this.formatTime('')
      });
    }

    this.isTyping = false;
    this.cdr.detectChanges();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // ✅ Force navigate and reload
    this.router.navigate(['/login']).then(() => {
      window.location.href = '/login';
    });
  }

  Dashboard() { this.router.navigate(['/dashboard']); }
  Settings() { this.router.navigate(['/settings']); }
}