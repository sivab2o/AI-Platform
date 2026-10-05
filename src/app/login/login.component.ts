import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import axios from 'axios';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {

  private readonly apiUrl =
    'http://localhost:3000/api/auth';

  email: string = '';
  password: string = '';

  otp: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  currentView:
    'login' |
    'forgot' |
    'reset' = 'login';

  isLoading: boolean = false;
  message: string = '';
  errorMessage: string = '';

  constructor(private router: Router) { }


  showLogin(): void {
    this.currentView = 'login';
    this.password = '';
    this.otp = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.clearMessages();
  }


  showForgotPassword(): void {
    this.currentView = 'forgot';
    this.password = '';
    this.clearMessages();
  }


  clearMessages(): void {
    this.message = '';
    this.errorMessage = '';
  }


  onSubmit(): void {

    this.clearMessages();

    if (!this.email.trim() || !this.password) {
      this.errorMessage =
        'Email and password are required.';
      return;
    }

    this.isLoading = true;

    axios.post(
      `${this.apiUrl}/login`,
      {
        email: this.email.trim(),
        password: this.password
      }
    )
      .then(response => {

        localStorage.setItem(
          'token',
          response.data.token
        );

        localStorage.setItem(
          'user',
          JSON.stringify(response.data.user)
        );

        const user = response.data.user;

        if (user?.role === 'admin') {
          this.router.navigateByUrl('/admin');
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      })
      .catch(error => {

        console.error(
          'Login failed:',
          error
        );

        this.errorMessage =
          error.response?.data?.message ||
          'Login failed. Please try again.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }


  sendVerificationCode(): void {

    this.clearMessages();

    const email =
      this.email.trim().toLowerCase();

    if (!email) {
      this.errorMessage =
        'Please enter your registered email.';
      return;
    }

    this.isLoading = true;

    axios.post(
      `${this.apiUrl}/forgot-password`,
      {
        email
      }
    )
      .then(response => {

        this.message =
          response.data?.message ||
          'Verification code sent to your email.';

        this.currentView = 'reset';
      })
      .catch(error => {

        console.error(
          'Forgot password error:',
          error
        );

        this.errorMessage =
          error.response?.data?.message ||
          'Verification code could not be sent.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }


  resetPassword(): void {

    this.clearMessages();

    const email =
      this.email.trim().toLowerCase();

    const otp =
      this.otp.trim();

    if (!email || !otp || !this.newPassword) {
      this.errorMessage =
        'Email, verification code and new password are required.';
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      this.errorMessage =
        'Enter the 6-digit verification code.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage =
        'Password must contain at least 8 characters.';
      return;
    }

    if (
      this.newPassword !==
      this.confirmPassword
    ) {
      this.errorMessage =
        'New password and confirm password do not match.';
      return;
    }

    this.isLoading = true;

    axios.post(
      `${this.apiUrl}/reset-password`,
      {
        email,
        otp,
        newPassword: this.newPassword
      }
    )
      .then(response => {

        this.currentView = 'login';

        this.message =
          response.data?.message ||
          'Password updated successfully. Please log in.';

        this.password = '';
        this.otp = '';
        this.newPassword = '';
        this.confirmPassword = '';
      })
      .catch(error => {

        console.error(
          'Reset password error:',
          error
        );

        this.errorMessage =
          error.response?.data?.message ||
          'Password could not be updated.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }


  resendVerificationCode(): void {
    this.sendVerificationCode();
  }
}