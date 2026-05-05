// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';  // Import AppComponent
import { LoginComponent } from './login/login.component';  // Import LoginComponent
import { SignupComponent } from './signup/signup.component';  // Import SignupComponent
import { AppRoutingModule } from './app-routing.module';  // Import app-routing.module.ts
import { FormsModule } from '@angular/forms';  // Import FormsModule for ngModel

@NgModule({
  declarations: [
    AppComponent,  // Declare the AppComponent here
    LoginComponent,  // Declare the LoginComponent here
    SignupComponent  // Declare the SignupComponent here
  ],
  imports: [
    BrowserModule,  // Import BrowserModule for running Angular on the web
    AppRoutingModule,  // Import the AppRoutingModule for routing
    FormsModule  // Import FormsModule to enable ngModel functionality
  ],
  providers: [],
  bootstrap: [AppComponent]  // Bootstrap the AppComponent here
})
export class AppModule { }