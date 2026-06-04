import { Component, OnInit, ChangeDetectorRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LanguageService } from '../services/language.service';

interface TrainingQuestion {
  question: string;
  options: string[];
  selectedOptions: string[];
  othersText: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, CKEditorModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  user: any;
  trainingText: string = '';
  isTrained: boolean = false;
  isEditing: boolean = false;
  isListening: boolean = false;
  isTranslating: boolean = false;
  isExpanded: boolean = false;
  recognition: any;
  selectedLang: string = 'en';
  originalTrainingText: string = '';
  masterTrainingText: string = '';
  totalConversations: number = 0;
  totalClients: number = 0;
  hotConversations: number = 0;
  coldConversations: number = 0;

  @ViewChild('fileInput') fileInput!: any;
  @ViewChild('imageInput') imageInput!: any;
  uploadedFiles: any[] = [];
  uploadedImages: any[] = [];

  showQuestionnaire: boolean = false;
  showTrainBox: boolean = false;
  currentQuestionIndex: number = 0;
  public Editor: any = null;
  public isBrowser: boolean = false;

  editorConfig = {
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'bulletedList', 'numberedList', '|',
      'blockQuote', '|',
      'insertTable', '|',
      'undo', 'redo'
    ]
  };

  originalQuestions: TrainingQuestion[] = [];

  questions: TrainingQuestion[] = [];

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private langService: LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  get currentQuestion(): TrainingQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  async ngOnInit() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadQuestions();
        this.loadDashboardStats();
      }

      setTimeout(async () => {
        try {
          const ckBuild = await import('@ckeditor/ckeditor5-build-classic');
          this.Editor = (ckBuild as any).default || ckBuild;
          this.isBrowser = true;
          this.cdr.detectChanges();
          console.log('CKEditor loaded:', this.Editor);
        } catch (err) {
          console.error('CKEditor load error:', err);
        }
      }, 100);
    }
  }

  loadDashboardStats() {
    const userId = this.user?.user_id;
    axios.get(`http://localhost:3000/api/ai/dashboard/stats/${userId}`)
      .then(res => {
        this.totalConversations = res.data.totalConversations;
        this.totalClients = res.data.totalClients;
        this.hotConversations = res.data.hotConversations;
        this.coldConversations = res.data.coldConversations;
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Stats error:', err));
  }

  goBackToDashboard() {
    this.showTrainBox = false;
    this.showQuestionnaire = false;
  }

  clearMaster() {
    if (confirm('Clear all master training data?')) {
      this.masterTrainingText = '';
    }
  }

  triggerFileUpload() {
    console.log('File input triggered');
    setTimeout(() => {
      this.fileInput.nativeElement.click();
    }, 0);
  }

  triggerImageUpload() {
    this.imageInput.nativeElement.click();
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result as string;
      console.log('File content:', content.substring(0, 200));

      // ✅ Append as HTML paragraph to CKEditor
      const htmlContent = `<p><strong>--- From file: ${file.name} ---</strong></p><p>${content.replace(/\n/g, '</p><p>')}</p>`;
      this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;

      this.uploadedFiles.push({ name: file.name });
      this.cdr.detectChanges();
    };

    reader.readAsText(file);
    event.target.value = '';
  }

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedImages.push({
        name: file.name,
        preview: e.target.result
      });
      this.masterTrainingText += (this.masterTrainingText ? '\n\n' : '') +
        `--- Image uploaded: ${file.name} ---\n[Image content noted]`;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
  }

  removeImage(index: number) {
    this.uploadedImages.splice(index, 1);
  }

  saveMasterAndClose() {
    this.toggleExpand();
    this.saveMasterAI();
  }

  async onLangChange() {
    if (this.selectedLang === 'en') {
      this.questions = this.originalQuestions.map(q => ({
        ...q, selectedOptions: [], othersText: ''
      }));
      this.currentQuestionIndex = 0;
      this.cdr.detectChanges();
      return;
    }

    this.isTranslating = true;
    this.cdr.detectChanges();

    try {
      const allTexts: string[] = [];
      this.originalQuestions.forEach(q => {
        allTexts.push(q.question);
        q.options.forEach(opt => allTexts.push(opt));
      });

      const allTranslated = await this.langService.translate(allTexts, this.selectedLang);

      let index = 0;
      this.questions = this.originalQuestions.map(q => {
        const translatedQuestion = allTranslated[index++];
        const translatedOptions = q.options.map(() => allTranslated[index++]);
        return {
          ...q,
          question: translatedQuestion,
          options: translatedOptions,
          selectedOptions: [],
          othersText: ''
        };
      });

      this.currentQuestionIndex = 0;
    } catch (err) {
      console.error('Translation error:', err);
    }

    this.isTranslating = false;
    this.cdr.detectChanges();
  }

  async onLangChangeTrainBox() {
    const sourceText = this.originalTrainingText || this.trainingText;
    if (!sourceText) return;

    if (this.selectedLang === 'en') {
      this.trainingText = sourceText;
      return;
    }

    this.isTranslating = true;
    this.cdr.detectChanges();

    try {
      const lines = sourceText.split('\n').filter(l => l.trim() !== '');
      const translated = await this.langService.translate(lines, this.selectedLang);
      this.trainingText = translated.join('\n');
    } catch (err) {
      console.error('Translation error:', err);
    }

    this.isTranslating = false;
    this.cdr.detectChanges();
  }

  loadQuestions() {
    const userId = this.user?.user_id;
    axios.get(`http://localhost:3000/api/ai/questions/${userId}`)
      .then(res => {
        if (res.data && res.data.length > 0) {
          this.originalQuestions = res.data.map((q: any) => ({
            question: q.question,
            options: q.question_type === 'multiple'
              ? [...q.options, ...(q.has_others ? ['Others'] : [])]
              : [],
            questionType: q.question_type,
            selectedOptions: [],
            othersText: ''
          }));
          this.questions = this.originalQuestions.map(q => ({
            ...q, selectedOptions: [], othersText: ''
          }));
          this.cdr.detectChanges();
        } else {
          // ✅ No questions added yet
          this.originalQuestions = [];
          this.questions = [];
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Questions load error:', err));
  }

  startTraining() {
    if (this.isTrained) {
      this.showTrainBox = true;
    } else {
      this.showQuestionnaire = true;
    }
  }

  startBasicTraining() {
    this.showTrainBox = false;
    this.showQuestionnaire = true;
    this.currentQuestionIndex = 0;
    this.questions = this.originalQuestions.map(q => ({
      ...q, selectedOptions: [], othersText: ''
    }));
  }

  startMasterTraining() {
    this.showQuestionnaire = false;
    this.showTrainBox = true;
    this.trainingText = this.masterTrainingText;
    this.selectedLang = 'en';
  }

  progressPercent(): number {
    return Math.round(((this.currentQuestionIndex + 1) / this.questions.length) * 100);
  }

  isSelected(opt: string): boolean {
    return this.currentQuestion.selectedOptions.includes(opt);
  }

  selectOption(opt: string) {
    const sel = this.currentQuestion.selectedOptions;
    const idx = sel.indexOf(opt);
    if (idx === -1) {
      sel.push(opt);
    } else {
      sel.splice(idx, 1);
      if (opt === this.questions[this.currentQuestionIndex].options[
        this.questions[this.currentQuestionIndex].options.length - 1
      ]) {
        this.currentQuestion.othersText = '';
      }
    }
  }

  isOthersSelected(): boolean {
    const q = this.currentQuestion;
    const lastOption = q.options[q.options.length - 1];
    return q.selectedOptions.includes(lastOption);
  }

  hasAnswer(): boolean {
    const q = this.currentQuestion;
    if (q.selectedOptions.length === 0) return false;
    if (this.isOthersSelected() && !q.othersText.trim()) return false;
    return true;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  async finishQuestionnaire() {
    this.buildTrainingData();
    this.originalTrainingText = this.trainingText;

    if (this.selectedLang !== 'en') {
      this.isTranslating = true;
      this.cdr.detectChanges();
      try {
        const lines = this.originalTrainingText.split('\n').filter(l => l.trim() !== '');
        const translated = await this.langService.translate(lines, this.selectedLang);
        this.trainingText = translated.join('\n');
      } catch (err) {
        console.error('Translation error:', err);
      }
      this.isTranslating = false;
      this.cdr.detectChanges();
    }

    this.showQuestionnaire = false;

    axios.post('http://localhost:3000/api/ai/train', {
      userId: this.user.user_id,
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      trainingData: this.originalTrainingText
    }).then(() => {
      this.isTrained = true;

      Swal.fire({
        icon: 'success',
        title: '🎉 Basic AI Employee is Ready!',
        html: `
          <p>Your AI Employee is trained and ready to work!</p>
          <p style="margin-top: 10px; font-size: 13px; color: #888;">Your shareable link is available on the dashboard.</p>
        `,
        confirmButtonText: 'Go to Dashboard',
        confirmButtonColor: '#DD1977',
        allowOutsideClick: false
      }).then(() => {
        window.location.reload();
      });

    }).catch(() => {
      alert('❌ Training failed');
    });
  }

  copyLink() {
    const link = `http://localhost:4200/user/${this.user.user_id}`;

    // ✅ Fallback for HTTP (non-secure)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Link Copied!',
          timer: 1000,
          showConfirmButton: false,
          confirmButtonColor: '#DD1977'
        });
      }).catch(() => {
        this.fallbackCopy(link);
      });
    } else {
      this.fallbackCopy(link);
    }
  }

  fallbackCopy(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      Swal.fire({
        icon: 'success',
        title: 'Link Copied!',
        timer: 1000,
        showConfirmButton: false,
        confirmButtonColor: '#DD1977'
      });
    } catch (err) {
      Swal.fire({
        icon: 'info',
        title: 'Copy manually:',
        text: text,
        confirmButtonColor: '#DD1977'
      });
    }
    document.body.removeChild(textArea);
  }

  buildTrainingData() {
    const parts: string[] = [];
    this.questions.forEach((q) => {
      if (q.selectedOptions.length === 0) return;
      const displayQuestion = q.question;
      let answers = q.selectedOptions.filter(a => {
        const lastOpt = q.options[q.options.length - 1];
        return a !== lastOpt;
      });
      if (this.isOthersSelected() && q.othersText.trim()) {
        answers.push(q.othersText.trim());
      }
      if (answers.length > 0) {
        parts.push(`${displayQuestion}\nAnswer: ${answers.join(', ')}`);
      }
    });
    this.trainingText = parts.join('\n\n');
  }

  redoQuestionnaire() {
    this.showTrainBox = false;
    this.showQuestionnaire = true;
    this.currentQuestionIndex = 0;
  }

  trainAI() {
    if (!this.trainingText.trim()) {
      alert('Please enter training data');
      return;
    }

    const dataToSave = this.trainingText;
    this.originalTrainingText = this.trainingText;

    axios.post('http://localhost:3000/api/ai/train', {
      userId: this.user.user_id,
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      trainingData: dataToSave
    }).then(() => {
      this.isTrained = true;
      this.isEditing = false;
      this.showTrainBox = false;
      this.showQuestionnaire = false;
      Swal.fire({
        icon: 'success',
        title: 'AI Updated Successfully!',
        confirmButtonColor: '#DD1977',
        timer: 1500,
        showConfirmButton: false
      });
    }).catch(() => alert('❌ Training failed'));
  }

  saveMasterAI() {
    if (!this.masterTrainingText.trim()) {
      alert('Please enter master training data');
      return;
    }

    axios.post('http://localhost:3000/api/ai/train/master', {
      userId: this.user.user_id,
      masterData: this.masterTrainingText
    }).then(() => {
      this.showTrainBox = false;
      Swal.fire({
        icon: 'success',
        title: 'Master AI Updated!',
        confirmButtonColor: '#DD1977',
        timer: 1500,
        showConfirmButton: false
      });
    }).catch(() => alert('❌ Save failed'));
  }

  updateAIFromExpand() {
    if (!this.trainingText.trim()) {
      alert('Please enter training data');
      return;
    }

    this.isExpanded = false;
    this.originalTrainingText = this.trainingText;

    axios.post('http://localhost:3000/api/ai/train', {
      userId: this.user.user_id,
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      trainingData: this.trainingText
    }).then(() => {
      this.isTrained = true;
      this.isEditing = false;
      Swal.fire({
        icon: 'success',
        title: 'AI Updated Successfully!',
        confirmButtonColor: '#DD1977'
      }).then(() => window.location.reload());
    }).catch(() => {
      alert('❌ Training failed');
    });
  }

  startListening() {
    if (this.isListening) {
      this.stopListening();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Swal.fire({
        icon: 'error',
        title: 'Not Supported',
        text: 'Please use Google Chrome browser for voice feature.',
        confirmButtonColor: '#DD1977'
      });
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach(track => track.stop());
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.lang = this.selectedLang === 'en' ? 'en-IN' : this.selectedLang + '-IN';
          this.recognition.continuous = false;
          this.recognition.interimResults = false;

          this.recognition.onstart = () => {
            this.isListening = true;
            this.cdr.detectChanges();
          };

          this.recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            this.masterTrainingText = this.masterTrainingText
              ? this.masterTrainingText + ' ' + transcript
              : transcript;
            this.cdr.detectChanges();
            if (this.isListening) {
              try { this.recognition.start(); } catch (e) { }
            }
          };

          this.recognition.onerror = (event: any) => {
            this.isListening = false;
            this.cdr.detectChanges();
            console.error('Speech error:', event.error);
          };

          this.recognition.onend = () => {
            if (this.isListening) {
              try {
                this.recognition.start();
              } catch (e) {
                this.isListening = false;
                this.cdr.detectChanges();
              }
            } else {
              this.cdr.detectChanges();
            }
          };

          this.recognition.start();

        } catch (err) {
          console.error('Speech init error:', err);
          this.isListening = false;
          this.cdr.detectChanges();
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'warning',
          title: 'Microphone Permission Denied',
          html: `
            <ol style="text-align:left; padding-left: 20px;">
              <li>Click the 🔒 icon in the address bar</li>
              <li>Click <b>"Site settings"</b></li>
              <li>Set <b>Microphone</b> to <b>Allow</b></li>
              <li>Refresh the page and try again</li>
            </ol>
          `,
          confirmButtonColor: '#DD1977'
        });
      });
  }

  stopListening() {
    this.isListening = false;
    this.cdr.detectChanges();
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  enableEdit() {
    this.isEditing = true;
    this.trainingText = this.originalTrainingText;
    this.selectedLang = 'en';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
  Clients() { this.router.navigate(['/clients']); }
  BasicQuestions() { this.router.navigate(['/basic-questions']); }
  Chat() { this.router.navigate(['/chat']); }
  Settings() { this.router.navigate(['/settings']); }
}