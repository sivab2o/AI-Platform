// src/app/app.routes.ts
import { Routes } from '@angular/router';  // Import Routes
import { LoginComponent } from './login/login.component';  // Import LoginComponent
import { SignupComponent } from './signup/signup.component';  // Import SignupComponent
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChatComponent } from './chat/chat.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'chat', component: ChatComponent },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];