import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import axios from 'axios';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  user: any;
  selectedLang: string = 'en';
  isSaving: boolean = false;

  constructor(private router: Router, private langService: LanguageService) { }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadLang();
      }
    }
  }

  loadLang() {
    axios.get(`http://localhost:3000/api/ai/user/lang/${this.user.id}`)
      .then(res => {
        this.selectedLang = res.data.lang || 'en';
      })
      .catch(err => console.error('Error loading lang', err));
  }

  selectLang(lang: string) {
    this.selectedLang = lang;
  }

  async saveSettings() {
    this.isSaving = true;

    try {
      // ✅ Save to DB
      await axios.put(`http://localhost:3000/api/ai/user/lang/${this.user.id}`, {
        lang: this.selectedLang
      });

      // ✅ Save to localStorage
      localStorage.setItem('lang', this.selectedLang);

      // ✅ Replace this:
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tr_')) localStorage.removeItem(key);
      });

      // ✅ Translate NOW in settings — not in dashboard
      if (this.selectedLang !== 'en') {
        await this.langService.translateAndCache(this.selectedLang);
      }

      this.isSaving = false;

      Swal.fire({
        icon: 'success',
        title: 'Settings Saved!',
        confirmButtonColor: '#DD1977',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        this.router.navigate(['/dashboard']);
      });

    } catch (err) {
      this.isSaving = false;
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: 'Could not save settings.',
        confirmButtonColor: '#DD1977'
      });
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  Dashboard() { this.router.navigate(['/dashboard']); }
  Chat() { this.router.navigate(['/chat']); }
}