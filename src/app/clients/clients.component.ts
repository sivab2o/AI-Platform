import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {

  user: any;
  clients: any[] = [];
  filteredClients: any[] = [];
  searchText: string = '';
  isLoading: boolean = true;

  constructor(private router: Router, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadClients();
      }
    }
  }

 getLeadType(score: number | undefined): string {
    const s = score || 0;
    if (s >= 8) return 'Hot';
    if (s >= 5) return 'Warm';
    return 'Cold';
  }

  loadClients() {
    this.isLoading = true;
    axios.get(`http://localhost:3000/api/ai/clients/${this.user.user_id}`)
      .then(res => {
        this.clients = res.data;
        this.filteredClients = res.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  onSearch() {
    const text = this.searchText.toLowerCase();
    this.filteredClients = this.clients.filter(c =>
      c.name?.toLowerCase().includes(text) ||
      c.mobile?.includes(text) ||
      this.getLeadType(c.interest_score).toLowerCase().includes(text)
    );
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  viewConversation(clientId: string) {
    this.router.navigate(['/clients', clientId, 'conversations']);
  }

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