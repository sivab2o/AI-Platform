// src/app/signup/signup.component.ts
import { Component } from '@angular/core';
import axios from 'axios';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';   // ✅ ADD THIS

@Component({
  selector: 'app-signup',
  standalone: true,              // ✅ must be true
  imports: [FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  name: string = '';  // Define the name property
  email: string = '';  // Define the email property
  mobile: string = '';  // Define the mobile property
  password: string = '';  // Define the password property

  constructor(private router: Router) { }

  onSubmit() {

     console.log("Signup clicked");  // 👈 ADD THIS
    // Send POST request to signup API endpoint
   axios.post('http://localhost:3000/api/auth/signup', {
      name: this.name,
      email: this.email,
      mobile: this.mobile,
      password: this.password
    })
      .then(response => {
        alert('Signup successful!');
        // You can navigate to the login page after signup
      })
      .catch(error => {
        console.error(error);
        alert('Signup failed. Please try again.');
      });
  }
}