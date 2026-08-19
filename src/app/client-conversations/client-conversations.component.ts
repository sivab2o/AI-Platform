import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import axios from 'axios';

@Component({
  selector: 'app-client-conversations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-conversations.component.html',
  styleUrls: ['./client-conversations.component.css']
})
export class ClientConversationsComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatBox') chatBox!: ElementRef;

  user: any;
  guestId: string = '';
  clientName: string = '';
  clientMobile: string = '';
  messages: any[] = [];
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
      }
    }
    this.guestId = this.route.snapshot.paramMap.get('guestId') || '';
    this.loadConversations();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    try {
      if (this.chatBox) {
        this.chatBox.nativeElement.scrollTop = this.chatBox.nativeElement.scrollHeight;
      }
    } catch (e) { }
  }

  loadConversations() {
    this.isLoading = true;
    axios.get(`http://localhost:3000/api/ai/guest/conversations/${this.guestId}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        this.messages = data;
        if (data.length > 0) {
          this.clientName = data[0].guest_name || 'Client';
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  goBack() { this.router.navigate(['/clients']); }
  Dashboard() { this.router.navigate(['/dashboard']); }
  Chat() { this.router.navigate(['/chat']); }
  Settings() { this.router.navigate(['/settings']); }
  BasicQuestions() { this.router.navigate(['/basic-questions']); }
    logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // ✅ Force navigate and reload
    this.router.navigate(['/login']).then(() => {
      window.location.href = '/login';
    });
  }
}