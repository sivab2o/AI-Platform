// src/app/login/login.component.ts
import { Component } from '@angular/core';
import axios from 'axios';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';  // Import the Router
import { RouterModule } from '@angular/router';   // ✅ ADD THIS

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.component.html',  // Use the external HTML file as template
  styleUrls: ['./login.component.css']  // Optional, add styles for the login page
})

export class LoginComponent {
  email: string = '';
  password: string = ''; 

  constructor(private router: Router) { }

  onSubmit() {
    axios.post('http://localhost:3000/api/auth/login', {
      email: this.email,
      password: this.password
    })
      .then(response => {

        // ✅ Store token
        localStorage.setItem('token', response.data.token);

        // ✅ Store user data (IMPORTANT)
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // ✅ Redirect
        this.router.navigate(['/dashboard']);
      })
      .catch(error => {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      });
  }
}