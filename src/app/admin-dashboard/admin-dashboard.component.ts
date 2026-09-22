import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import axios from 'axios';

interface AdminSummary {
  totalOwners: number;
  activeOwners: number;
  inactiveOwners: number;
  totalGuests: number;
  totalConversations: number;
  totalFiles: number;
}

interface Owner {
  id: number;
  user_id: string;
  name: string;
  email: string;
  mobile: string;
  lang: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
  totalGuests: number;
  totalConversations: number;
  totalFiles: number;
  emailConfigured: number | boolean;
  whatsappConfigured: number | boolean;

  chat_limit: number;
  chats_used: number;
  chat_balance: number;
  newChatLimit: number;
}

interface Payment {
  id: number;
  ownerId: number;
  ownerUserId: string;
  ownerName: string;
  email: string;
  mobile: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  paidAt: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent
  implements OnInit {

  private readonly apiUrl =
    'http://localhost:3000/api/admin';

  summary: AdminSummary = {
    totalOwners: 0,
    activeOwners: 0,
    inactiveOwners: 0,
    totalGuests: 0,
    totalConversations: 0,
    totalFiles: 0
  };

  isPaymentsView = false;
  owners: Owner[] = [];
  filteredOwners: Owner[] = [];
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];

  paymentSearchText = '';
  selectedPaymentStatus = 'all';

  searchText = '';
  selectedStatus = 'all';

  isLoading = false;
  updatingOwnerId: number | null = null;
  updatingLimitOwnerId: number | null = null;
  errorMessage = '';

  adminName = 'Administrator';

constructor(
  private router: Router,
  private route: ActivatedRoute,

  @Inject(PLATFORM_ID)
  private platformId: Object
) {}

 ngOnInit(): void {
  if (!isPlatformBrowser(this.platformId)) {
    return;
  }

  this.isPaymentsView =
    this.route.snapshot.data['view'] ===
    'payments';

  this.loadAdminDetails();

  if (this.isPaymentsView) {
    this.loadPaymentsPage();
  } else {
    this.loadDashboard();
  }
}

  loadAdminDetails(): void {
    const storedUser =
      localStorage.getItem('user');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      this.adminName =
        user.name ||
        'Administrator';

    } catch (error) {
      this.adminName = 'Administrator';
    }
  }

  getAuthHeaders(): any {

    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }

    const token =
      localStorage.getItem('token');

    return {
      Authorization: `Bearer ${token}`
    };
  }

  async loadDashboard(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await Promise.all([
        this.loadSummary(),
        this.loadOwners()
      ]);

    } catch (error: any) {
      console.error(
        'Admin dashboard error:',
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        this.logout();
        return;
      }

      this.errorMessage =
        error.response?.data?.message ||
        'Unable to load admin dashboard';

    } finally {
      this.isLoading = false;
    }
  }

  async loadSummary(): Promise<void> {
    const response = await axios.get(
      `${this.apiUrl}/summary`,
      {
        headers: this.getAuthHeaders()
      }
    );

    this.summary = {
      totalOwners:
        Number(response.data.totalOwners) || 0,

      activeOwners:
        Number(response.data.activeOwners) || 0,

      inactiveOwners:
        Number(response.data.inactiveOwners) || 0,

      totalGuests:
        Number(response.data.totalGuests) || 0,

      totalConversations:
        Number(response.data.totalConversations) || 0,

      totalFiles:
        Number(response.data.totalFiles) || 0
    };
  }

  async loadOwners(): Promise<void> {
    const response = await axios.get(
      `${this.apiUrl}/owners`,
      {
        headers: this.getAuthHeaders()
      }
    );

    this.owners =
      (response.data.owners || []).map(
        (owner: Owner) => ({
          ...owner,

          totalGuests:
            Number(owner.totalGuests) || 0,

          totalConversations:
            Number(owner.totalConversations) || 0,

          totalFiles:
            Number(owner.totalFiles) || 0,

          chat_limit:
            Number(owner.chat_limit) || 0,

          chats_used:
            Number(owner.chats_used) || 0,

          chat_balance:
            Math.max(
              Number(owner.chat_limit || 0) -
              Number(owner.chats_used || 0),
              0
            ),

          newChatLimit:
            Number(owner.chat_limit) || 0,

          emailConfigured:
            Boolean(
              Number(owner.emailConfigured)
            ),

          whatsappConfigured:
            Boolean(
              Number(owner.whatsappConfigured)
            )
        })
      );

    this.filterOwners();
  }

  filterOwners(): void {
    const search =
      this.searchText
        .toLowerCase()
        .trim();

    this.filteredOwners =
      this.owners.filter(owner => {

        const matchesSearch =
          !search ||
          owner.name
            ?.toLowerCase()
            .includes(search) ||
          owner.email
            ?.toLowerCase()
            .includes(search) ||
          owner.mobile
            ?.toLowerCase()
            .includes(search) ||
          owner.user_id
            ?.toLowerCase()
            .includes(search);

        const matchesStatus =
          this.selectedStatus === 'all' ||
          owner.status === this.selectedStatus;

        return (
          matchesSearch &&
          matchesStatus
        );
      });
  }

  async toggleOwnerStatus(
    owner: Owner
  ): Promise<void> {

    const newStatus =
      owner.status === 'active'
        ? 'inactive'
        : 'active';

    const action =
      newStatus === 'active'
        ? 'activate'
        : 'deactivate';

    const confirmed = confirm(
      `Are you sure you want to ${action} ${owner.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.updatingOwnerId = owner.id;
    this.errorMessage = '';

    try {
      await axios.patch(
        `${this.apiUrl}/owners/${owner.id}/status`,
        {
          status: newStatus
        },
        {
          headers: this.getAuthHeaders()
        }
      );

      owner.status = newStatus;

      await this.loadSummary();
      this.filterOwners();

    } catch (error: any) {
      console.error(
        'Update owner status error:',
        error
      );

      this.errorMessage =
        error.response?.data?.message ||
        'Unable to update owner status';

    } finally {
      this.updatingOwnerId = null;
    }
  }

  async updateChatLimit(
    owner: Owner,
    resetUsage = false
  ): Promise<void> {

    const newLimit =
      Number(owner.newChatLimit);

    if (
      !Number.isInteger(newLimit) ||
      newLimit < 0
    ) {
      alert(
        'Enter a valid chat limit. Use zero or a positive whole number.'
      );

      return;
    }

    if (resetUsage) {
      const confirmed = confirm(
        `Update ${owner.name}'s limit to ${newLimit} and reset used chats to zero?`
      );

      if (!confirmed) {
        return;
      }
    }

    this.updatingLimitOwnerId = owner.id;
    this.errorMessage = '';

    try {
      await axios.patch(
        `${this.apiUrl}/owners/${owner.id}/chat-limit`,
        {
          chatLimit: newLimit,
          resetUsage
        },
        {
          headers: this.getAuthHeaders()
        }
      );

      await Promise.all([
        this.loadOwners(),
        this.loadSummary()
      ]);

    } catch (error: any) {
      console.error(
        'Update chat limit error:',
        error
      );

      this.errorMessage =
        error.response?.data?.message ||
        'Unable to update chat limit';

    } finally {
      this.updatingLimitOwnerId = null;
    }
  }

  async loadPayments(): Promise<void> {
  const response = await axios.get(
    `${this.apiUrl}/payments`,
    {
      headers: this.getAuthHeaders()
    }
  );

  this.payments =
    (response.data.payments || []).map(
      (payment: Payment) => ({
        ...payment,
        amount: Number(payment.amount) || 0
      })
    );

  this.filterPayments();
}

filterPayments(): void {
  const search =
    this.paymentSearchText
      .toLowerCase()
      .trim();

  this.filteredPayments =
    this.payments.filter(payment => {

      const matchesSearch =
        !search ||
        payment.ownerName
          ?.toLowerCase()
          .includes(search) ||
        payment.ownerUserId
          ?.toLowerCase()
          .includes(search) ||
        payment.email
          ?.toLowerCase()
          .includes(search) ||
        payment.mobile
          ?.includes(search) ||
        payment.paymentId
          ?.toLowerCase()
          .includes(search) ||
        payment.orderId
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        this.selectedPaymentStatus === 'all' ||
        payment.status ===
          this.selectedPaymentStatus;

      return matchesSearch && matchesStatus;
    });
}

formatAmount(amountInPaise: number): string {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR'
    }
  ).format(
    Number(amountInPaise || 0) / 100
  );
}

getTotalPaidAmount(): number {
  return this.filteredPayments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );
}

  refreshDashboard(): void {
    this.loadDashboard();
  }

  openAdminDashboard(): void {
  this.router.navigate(['/admin']);
}

openAdminPayments(): void {
  this.router.navigate(['/admin/payments']);
}

async loadPaymentsPage(): Promise<void> {
  this.isLoading = true;
  this.errorMessage = '';

  try {
    await this.loadPayments();

  } catch (error: any) {
    console.error(
      'Admin payments error:',
      error
    );

    if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      this.logout();
      return;
    }

    this.errorMessage =
      error.response?.data?.message ||
      'Unable to load payment details';

  } finally {
    this.isLoading = false;
  }
}

  logout(): void {

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    this.router.navigate(['/login']);
  }

  formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    return new Date(date)
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
  }
}