import { Component } from '@angular/core';
import axios from 'axios';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterModule
} from '@angular/router';

declare global {
  interface Window {
    Razorpay: any;
  }
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {

  name = '';
  email = '';
  mobile = '';
  password = '';
  confirmPassword = '';
  acceptedTerms = false;
  isProcessing = false

  selectedPlan = 'platinum';

  plans = [
    {
      code: 'platinum',
      name: 'Platinum',
      originalPrice: 12000,
      price: 10200,
      discountPercent: 15,
      testPrice: 4,
      characterLimit: 2040000,
      speakingSeconds: 170000,
      validity: '12 Months (365 Days)',
      benefits: [
        'Conversation Download Report',
        'Unlimited One-to-One Sessions with Mastermind Elango',
        'Personalized Setup Assistance',
        'Advanced Setup with Images and Files',
        'Setup Assistance Video',
        'Free Consulting',
        'Free Education Webinar'
      ]
    },
    {
      code: 'gold',
      name: 'Gold',
      originalPrice: 6000,
      price: 5400,
      discountPercent: 10,
      testPrice: 3,
      characterLimit: 1080000,
      speakingSeconds: 90000,
      validity: '6 Months (180 Days)',
      benefits: [
        'Conversation Download Report',
        'Advanced Setup with Images and Files',
        'Setup Assistance Video',
        'Free Education Webinar'
      ]
    },
    {
      code: 'silver',
      name: 'Silver',
      originalPrice: 3000,
      price: 2850,
      discountPercent: 5,
      testPrice: 2,
      characterLimit: 570000,
      speakingSeconds: 47500,
      validity: '3 Months (90 Days)',
      benefits: [
        'Advanced Setup with Images and Files',
        'Setup Assistance Video',
        'Free Education Webinar'
      ]
    },
    {
      code: 'trial',
      name: 'Trial Pack',
      originalPrice: 499,
      price: 499,
      discountPercent: 0,
      testPrice: 1,
      characterLimit: 99800,
      speakingSeconds: 8317,
      validity: '15 Days',
      benefits: [
        'Basic Setup',
        'Setup Assistance Video',
        'Education Webinar'
      ]
    }
  ];

  get selectedPlanPrice(): number {
    return (
      this.plans.find(
        plan => plan.code === this.selectedPlan
      )?.price || 0
    );
  }

  get selectedTestPrice(): number {
    return (
      this.plans.find(
        plan => plan.code === this.selectedPlan
      )?.testPrice || 0
    );
  }

  private readonly apiUrl =
    'https://aiemployeeplatform.leadsfactory.info/api/auth';

  constructor(private router: Router) { }


  private loadRazorpayScript(): Promise<boolean> {
    return new Promise(resolve => {

      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript =
        document.getElementById(
          'razorpay-checkout-script'
        );

      if (existingScript) {
        existingScript.addEventListener(
          'load',
          () => resolve(true)
        );

        existingScript.addEventListener(
          'error',
          () => resolve(false)
        );

        return;
      }

      const script =
        document.createElement('script');

      script.id =
        'razorpay-checkout-script';

      script.src =
        'https://checkout.razorpay.com/v1/checkout.js';

      script.onload =
        () => resolve(true);

      script.onerror =
        () => resolve(false);

      document.body.appendChild(script);
    });
  }


  private validateForm(): boolean {

    if (!this.acceptedTerms) {
      alert(
        'Please read and accept the Terms and Conditions before continuing with payment.'
      );

      return false;
    }
    this.name = this.name.trim();
    this.email =
      this.email.trim().toLowerCase();
    this.mobile =
      this.mobile.replace(/\D/g, '');

    if (
      !this.name ||
      !this.email ||
      !this.mobile ||
      !this.password ||
      !this.confirmPassword
    ) {
      alert('Please enter all signup details.');
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(this.email)) {
      alert('Please enter a valid email address.');
      return false;
    }

    if (this.mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return false;
    }

    if (this.password.length < 6) {
      alert('New Password must contain at least 6 characters.');
      return false;
    }

    if (this.password !== this.confirmPassword) {
      alert('New Password and Confirm New Password do not match.');
      return false;
    }

    return true;
  }


  async onSubmit(): Promise<void> {
    if (
      this.isProcessing ||
      !this.validateForm()
    ) {
      return;
    }

    this.isProcessing = true;

    try {
      const scriptLoaded =
        await this.loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          'Razorpay Checkout could not be loaded'
        );
      }

      const signupData = {
        name: this.name,
        email: this.email,
        mobile: this.mobile,
        password: this.password,
        planCode: this.selectedPlan
      };

      const orderResponse = await axios.post(
        `${this.apiUrl}/signup/create-order`,
        signupData
      );

      const order = orderResponse.data;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'AI Employee Platform',
        description:
          `${order.plan.name} - Testing Payment ₹${order.plan.testPrice}`,
        order_id: order.orderId,

        prefill: {
          name: this.name,
          email: this.email,
          contact: this.mobile
        },

        theme: {
          color: '#d41472'
        },

        modal: {
          ondismiss: () => {
            this.isProcessing = false;
          }
        },

        handler: async (paymentResponse: any) => {
          try {
            await axios.post(
              `${this.apiUrl}/signup/verify-payment`,
              {
                ...signupData,

                razorpay_order_id:
                  paymentResponse.razorpay_order_id,

                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,

                razorpay_signature:
                  paymentResponse.razorpay_signature
              }
            );

            alert(
              'Payment successful. Your account has been created.'
            );

            this.router.navigate(['/login']);

          } catch (error: any) {
            console.error(
              'Payment verification error:',
              error
            );

            alert(
              error.response?.data?.message ||
              'Payment verification failed. Please contact support.'
            );

          } finally {
            this.isProcessing = false;
          }
        }
      };

      const checkout =
        new window.Razorpay(options);

      checkout.on(
        'payment.failed',
        (response: any) => {
          console.error(
            'Payment failed:',
            response.error
          );

          alert(
            response.error?.description ||
            'Payment failed. Please try again.'
          );

          this.isProcessing = false;
        }
      );

      checkout.open();

    } catch (error: any) {
      console.error(
        'Signup payment error:',
        error
      );

      alert(
        error.response?.data?.message ||
        'Unable to start payment. Please try again.'
      );

      this.isProcessing = false;
    }
  }
}