import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  user: any;
  userMessage: string = '';
  messages: any[] = [];
  isTrained: boolean = false;

  constructor(private router: Router) {}

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');

      if (userData) {
        this.user = JSON.parse(userData);
        this.checkTraining();
      }
    }
  }

  // ✅ CHECK IF AI TRAINED
  checkTraining() {
    axios.get(`http://localhost:3000/api/ai/train/${this.user.id}`)
      .then(res => {
        if (res.data && res.data.training_data) {
          this.isTrained = true;
        } else {
          this.showNotTrained();
        }
      })
      .catch(err => {
        console.error(err);
      });
  }

  // ❌ IF NOT TRAINED
  showNotTrained() {
    Swal.fire({
      icon: 'warning',
      title: 'Train your AI first!',
      text: 'Go to dashboard and train your AI employee.',
      confirmButtonText: 'Go to Dashboard'
    }).then(() => {
      this.router.navigate(['/dashboard']);
    });
  }

  // 💬 SEND MESSAGE
  sendMessage() {

    if (!this.userMessage.trim()) return;

    // Push user message
    this.messages.push({
      sender: 'user',
      text: this.userMessage
    });

    const msg = this.userMessage;
    this.userMessage = '';

    // 🔥 CALL YOUR AI BACKEND HERE
    axios.post('http://localhost:3000/api/chat', {
      userId: this.user.id,
      message: msg
    })
      .then(res => {
        this.messages.push({
          sender: 'bot',
          text: res.data.reply
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  Dashboard() {
    this.router.navigate(['/dashboard']);
  }
}