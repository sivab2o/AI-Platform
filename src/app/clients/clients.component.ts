import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  searchText = '';
  isLoading = true;

  isPaymentsView = false;
  payments: any[] = [];
  filteredPayments: any[] = [];
  paymentSearchText = '';
  paymentError = '';
  downloadingClientId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isPaymentsView =
      this.route.snapshot.data['view'] === 'payments';

    if (typeof window === 'undefined') return;

    const userData = localStorage.getItem('user');
    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.user = JSON.parse(userData);
      if (this.isPaymentsView) {
        this.loadPayments();
      } else {
        this.loadClients();
      }
    } catch {
      this.logout();
    }
  }

  getLeadType(score: number | undefined): string {
    const s = score || 0;
    if (s >= 8) return 'Hot';
    if (s >= 5) return 'Warm';
    return 'Cold';
  }

  loadClients(): void {
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

  loadPayments(): void {
    this.isLoading = true;
    this.paymentError = '';
    const token = localStorage.getItem('token');

    axios.get('http://localhost:3000/api/payments/my', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        this.payments = res.data.payments || [];
        this.filteredPayments = [...this.payments];
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error('Load payments error:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          this.logout();
          return;
        }
        this.paymentError = err.response?.data?.message ||
          'Unable to load payment details';
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  onSearch(): void {
    const text = this.searchText.toLowerCase();
    this.filteredClients = this.clients.filter(c =>
      c.name?.toLowerCase().includes(text) ||
      c.mobile?.includes(text) ||
      this.getLeadType(c.interest_score).toLowerCase().includes(text)
    );
  }

  searchPayments(): void {
    const text = this.paymentSearchText.toLowerCase().trim();
    this.filteredPayments = this.payments.filter(payment =>
      !text ||
      payment.paymentId?.toLowerCase().includes(text) ||
      payment.orderId?.toLowerCase().includes(text) ||
      payment.status?.toLowerCase().includes(text) ||
      payment.method?.toLowerCase().includes(text)
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

  formatAmount(amountInPaise: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR'
    }).format(Number(amountInPaise || 0) / 100);
  }

  getTotalPaymentAmount(): number {
    return this.filteredPayments.reduce(
      (total, payment) => total + Number(payment.amount || 0), 0
    );
  }

  canDownloadConversationReport(): boolean {
  const plan =
    String(
      this.user?.current_plan || ''
    ).toLowerCase();

  return (
    plan === 'gold' ||
    plan === 'platinum'
  );
}

async downloadConversationReport(
  client: any
): Promise<void> {
  if (!this.canDownloadConversationReport()) {
    alert(
      'Conversation Report is available only for Gold and Platinum plans.'
    );

    return;
  }

  const token =
    localStorage.getItem('token');

  if (!token) {
    this.logout();
    return;
  }

  this.downloadingClientId =
    Number(client.id);

  try {
    const response = await axios.get(
      `http://localhost:3000/api/ai/guest/conversations/${client.id}/report`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        },

        responseType: 'blob'
      }
    );

   const blob = new Blob(
  [response.data],
  {
    type: 'application/pdf'
  }
);

    const downloadUrl =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = downloadUrl;

    const safeName =
      String(
        client.name ||
        `client-${client.id}`
      )
        .replace(/[^a-z0-9_-]/gi, '-')
        .replace(/-+/g, '-');

    link.download =
  `${safeName}-conversation-report.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(
      downloadUrl
    );

  } catch (error: any) {
    console.error(
      'Download report error:',
      error
    );

    if (
      error.response?.status === 401
    ) {
      this.logout();
      return;
    }

    if (
      error.response?.data instanceof Blob
    ) {
      try {
        const errorText =
          await error.response.data.text();

        const errorData =
          JSON.parse(errorText);

        alert(
          errorData.message ||
          'Unable to download report'
        );
      } catch {
        alert(
          'Unable to download report'
        );
      }

      return;
    }

    alert(
      error.response?.data?.message ||
      'Unable to download report'
    );

  } finally {
    this.downloadingClientId = null;
    this.cdr.detectChanges();
  }
}

  viewConversation(clientId: string): void {
    this.router.navigate(['/clients', clientId, 'conversations']);
  }

  Dashboard(): void { this.router.navigate(['/dashboard']); }
  Clients(): void { this.router.navigate(['/clients']); }
  Payments(): void { this.router.navigate(['/payments']); }
  Chat(): void { this.router.navigate(['/chat']); }
  Settings(): void { this.router.navigate(['/settings']); }
  BasicQuestions(): void { this.router.navigate(['/basic-questions']); }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']).then(() => {
      window.location.href = '/login';
    });
  }
}
