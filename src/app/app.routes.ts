import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChatComponent } from './chat/chat.component';
import { SettingsComponent } from './settings/settings.component';
import { PublicChatComponent } from './public-chat/public-chat.component';
import { ClientsComponent } from './clients/clients.component';
import { ClientConversationsComponent } from './client-conversations/client-conversations.component';
import { BasicQuestionsComponent } from './basic-questions/basic-questions.component';
import { AuthGuard } from './guards/auth.guard';


export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'clients', component: ClientsComponent, canActivate: [AuthGuard] },
    { path: 'clients/:guestId/conversations', component: ClientConversationsComponent, canActivate: [AuthGuard] },
    { path: 'basic-questions', component: BasicQuestionsComponent, canActivate: [AuthGuard] },
    { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
    // { path: 'user/:ownerId', component: PublicChatComponent, canActivate: [AuthGuard] },
    { path: 'user/:ownerId', component: PublicChatComponent },
    { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' } // ✅ Add this wildcard
];