import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import axios from 'axios';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  user: any;
  selectedLang: string = 'en';
  isSaving: boolean = false;

  defaultUi: any = {
    title: 'Settings',
    dashboard: 'Dashboard',
    chat: 'Chat',
    leads: 'Leads',
    documents: 'Documents',
    voice: 'Voice',
    settings: 'Settings',
    logout: 'Logout',
    language: 'Language',
    languageSub: 'Choose your preferred language for the app',
    english: 'English',
    tamil: 'தமிழ் (Tamil)',
    saveSettings: 'Save Settings',
    translating: 'Translating...',
    translatingSaving: 'Translating & Saving... please wait'
  };

  ui: any = { ...this.defaultUi };

  constructor(private router: Router, private langService: LanguageService) { }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadLang();
        const lang = localStorage.getItem('lang') || this.user?.lang || 'en';
        if (lang !== 'en') {
          this.translatePage(lang);
        }
      }
    }
  }

  loadLang() {
    axios.get(`http://localhost:3000/api/ai/user/lang/${this.user.id}`)
      .then(res => {
        this.selectedLang = res.data.lang || 'en';
        if (this.selectedLang === 'en') {
          this.ui = { ...this.defaultUi };
        } else {
          this.translatePage(this.selectedLang);
        }
      })
      .catch(err => console.error('Error loading lang', err));
  }

  async translatePage(lang: string) {
    try {
      if (lang === 'en') {
        this.ui = { ...this.defaultUi };
        return;
      }
      const fixedKeys = ['english', 'tamil'];
      const keys = Object.keys(this.defaultUi).filter(key => !fixedKeys.includes(key));
      const values = keys.map(key => this.defaultUi[key]);
      const translated = await this.langService.translate(values, lang);
      keys.forEach((key, i) => {
        this.ui[key] = translated[i];
      });
      this.ui.english = 'English';
      this.ui.tamil = 'தமிழ் (Tamil)';
    } catch (err) {
      console.error('Settings translation error:', err);
    }
  }

  selectLang(lang: string) {
    this.selectedLang = lang;
  }

  async saveSettings() {
    this.isSaving = true;
    try {
      await axios.put(`http://localhost:3000/api/ai/user/lang/${this.user.id}`, {
        lang: this.selectedLang
      });
      localStorage.setItem('lang', this.selectedLang);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tr_')) localStorage.removeItem(key);
      });
      if (this.selectedLang !== 'en') {
        await this.langService.translateAndCache(this.selectedLang);
        await this.translatePage(this.selectedLang);
      } else {
        this.ui = { ...this.defaultUi };
      }
      this.isSaving = false;
      Swal.fire({
        icon: 'success',
        title: this.selectedLang === 'ta' ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings Saved!',
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
        title: this.selectedLang === 'ta' ? 'தோல்வி!' : 'Failed!',
        text: this.selectedLang === 'ta' ? 'அமைப்புகளை சேமிக்க முடியவில்லை.' : 'Could not save settings.',
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
  Clients() { this.router.navigate(['/clients']); } // ✅ Add this
  Settings() { this.router.navigate(['/settings']); }
}