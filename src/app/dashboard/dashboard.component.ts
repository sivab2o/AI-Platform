import { Component, OnInit, ChangeDetectorRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LanguageService } from '../services/language.service';

interface TrainingQuestion {
  id: string;
  section: string;
  question: string;
  fieldType: string;
  options: string[];
  mandatory: boolean;
  placeholder: string;
  value: any;
  valueHour?: string;
  valueMinute?: string;
  valueAmPm?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
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
  leadHot: number = 0;
  leadWarm: number = 0;
  leadCold: number = 0;
  isEmailVerifying = false;
  emailVerified = false;
  emailError = '';
  isCKExpanded: boolean = false;
  ckEditorInstance: any = null;
  ckEditorFullscreen: any = null;
  private ckRetryCount: number = 0;
  sessionExtractedText: string = '';
  filledQAPairs: { question: string; answer: string }[] = [];

  // ✅ Master training type
  masterTrainingType: string = ''; // 'qa' | 'file' | 'url'
  masterUploadedFiles: any[] = [];
  websiteUrl: string = '';
  isFetchingUrl: boolean = false;
  hourOptions: string[] = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  minuteOptions: string[] = ['00', '15', '30', '45'];

  @ViewChild('fileInput') fileInput!: any;
  @ViewChild('imageInput') imageInput!: any;
  @ViewChild('masterFileInput') masterFileInput!: any;
  uploadedFiles: any[] = [];
  uploadedImages: any[] = [];

  showQuestionnaire: boolean = false;
  showTrainBox: boolean = false;
  currentSectionIndex: number = 0;
  public Editor: any = null;
  public isBrowser: boolean = false;

  sections: string[] = [
    'AI Identity',
    'Business Information',
    'Working Hours',
    'Customer Handling',
    'Human Escalation',
    'Greetings',
    'AI Rules'
  ];

  editorConfig = {
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'bulletedList', 'numberedList', '|',
      'blockQuote', '|',
      'insertTable', '|',
      'undo', 'redo', '|',
      'voiceInput', 'fileUpload', 'clearContent', 'expandEditor'
    ]
  };

  questions: TrainingQuestion[] = [];

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private langService: LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  updateTimeValue(q: TrainingQuestion) {
    if (!q.valueHour || !q.valueMinute || !q.valueAmPm) return;
    let hour = parseInt(q.valueHour, 10);
    if (q.valueAmPm === 'PM' && hour !== 12) hour += 12;
    if (q.valueAmPm === 'AM' && hour === 12) hour = 0;
    const hourStr = hour.toString().padStart(2, '0');
    q.value = `${hourStr}:${q.valueMinute}`; // stored as 24hr for backend
  }

  get currentSectionQuestions(): TrainingQuestion[] {
    return this.questions.filter(q => q.section === this.sections[this.currentSectionIndex]);
  }

  get totalSections(): number {
    return this.sections.length;
  }

  sectionProgressPercent(): number {
    return Math.round(((this.currentSectionIndex + 1) / this.sections.length) * 100);
  }


  isCheckboxSelected(q: TrainingQuestion, opt: string): boolean {
    return Array.isArray(q.value) && q.value.includes(opt);
  }

  toggleCheckbox(q: TrainingQuestion, opt: string) {
    if (!Array.isArray(q.value)) q.value = [];
    const idx = q.value.indexOf(opt);
    if (idx === -1) q.value.push(opt);
    else q.value.splice(idx, 1);
  }

  isSectionValid(): boolean {
    return this.currentSectionQuestions
      .filter(q => q.mandatory)
      .every(q => {
        if (q.fieldType === 'checkbox') return Array.isArray(q.value) && q.value.length > 0;
        return q.value !== null && q.value !== undefined && q.value !== '';
      });
  }

  verifyBusinessEmail(q: any) {

    const emailQuestion = this.questions.find(
      x => x.id === 'business_email'
    );

    const passwordQuestion = this.questions.find(
      x => x.id === 'business_app_password'
    );


    if (!emailQuestion?.value || !passwordQuestion?.value) {
      this.emailError = 'Business Gmail and App Password are required';
      this.emailVerified = false;
      return;
    }


    this.isEmailVerifying = true;
    this.emailError = '';

    console.log(
      "VERIFY EMAIL:",
      emailQuestion.value
    );

    console.log(
      "VERIFY PASSWORD:",
      passwordQuestion.value.replace(/\s/g, ''),
    );

    console.log(
      "PASSWORD LENGTH:",
      passwordQuestion.value.replace(/\s/g, '').length
    );

    this.http.post<any>(
      'https://aiemployeeplatform.leadsfactory.info/api/ai/test-business-email',
      {
        email: emailQuestion.value.trim(),

        password: passwordQuestion.value
          .replace(/\s/g, '')
          .trim()
      }
    )
      .subscribe({

        next: (res: any) => {

          this.isEmailVerifying = false;

          if (res.success) {

            this.emailVerified = true;
            this.emailError = '';

          } else {

            this.emailVerified = false;
            this.emailError =
              'Invalid Gmail or App Password. Please check Google App Password.';

          }

        },


        error: () => {

          this.isEmailVerifying = false;
          this.emailVerified = false;

          this.emailError =
            'Invalid Gmail or App Password. Please check Google App Password.';

        }

      });

  }

  isAllQuestionsValid(): boolean {

    return this.questions
      .filter(q => q.mandatory)
      .every(q => {

        if (q.fieldType === 'checkbox') {
          return Array.isArray(q.value) && q.value.length > 0;
        }

        return q.value !== null &&
          q.value !== undefined &&
          q.value !== '';

      });

  }

  nextSection() {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.cdr.detectChanges();
    }
  }

  prevSection() {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.cdr.detectChanges();
    }
  }

  async ngOnInit() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      // ✅ Redirect to login if not logged in
      if (!userData || !token) {
        this.router.navigate(['/login']);
        return;
      }

      if (userData) {
        this.user = JSON.parse(userData);

        this.loadTrainingData();
        this.loadQuestions();
        this.loadDashboardStats();

        // ✅ CKEditor plugin events
        document.addEventListener('ck-voice-start', () => {
          this.startListening();
        });

        document.addEventListener('ck-voice-stop', () => {
          this.stopListening();
        });

        document.addEventListener('ck-file-upload', (event: any) => {
          this.handleCKFileUpload(event.detail.file);
        });

        document.addEventListener('ck-clear-content', () => {
          if (confirm('Clear all master training data?')) {
            this.masterTrainingText = '';
            if (this.activeEditor) {
              this.activeEditor.setData('');
            }
            this.cdr.detectChanges();
          }
        });

        document.addEventListener('ck-expand-editor', () => {
          this.toggleCKExpand();
        });
      }
    }
  }

  get activeEditor(): any {
    return this.ckEditorFullscreen || this.ckEditorInstance;
  }

  // ✅ Select master training type
  selectMasterType(type: string) {
    this.masterTrainingType = type;
    this.cdr.detectChanges();

    // ✅ If Q&A, init CKEditor after DOM renders
    if (type === 'qa') {
      setTimeout(() => { this.initCKEditor(); }, 600);
    }
  }

  // ✅ Q&A pairs
  qaPairs: { question: string; answer: string }[] = [{ question: '', answer: '' }];

  triggerDetect() {
    this.filledQAPairs = this.qaPairs.filter(
      qa => qa.question.trim() !== '' && qa.answer.trim() !== ''
    );
    this.cdr.detectChanges();
  }


  addQAPair() {
    this.qaPairs.push({ question: '', answer: '' });
    this.triggerDetect();
  }

  removeQAPair(index: number) {
    this.qaPairs.splice(index, 1);
    this.triggerDetect();
  }

  // ✅ Check at least one Q&A is filled
  isQAValid(): boolean {
    return this.qaPairs.some(qa => qa.question.trim() && qa.answer.trim());
  }

  // ✅ Save Q&A as master training text
  saveQAMaster() {
    const filled = this.qaPairs.filter(qa => qa.question.trim() && qa.answer.trim());
    if (filled.length === 0) {
      alert('Please add at least one Question and Answer');
      return;
    }

    // ✅ Convert Q&A to HTML for storage
    const htmlContent = filled.map((qa, i) =>
      `<p><strong>Q${i + 1}: ${qa.question}</strong></p><p>A: ${qa.answer}</p>`
    ).join('');

    this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;

    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/train/master', {
      userId: this.user.user_id,
      masterData: this.masterTrainingText
    }).then(() => {
      this.filledQAPairs = [];
      this.showTrainBox = false;
      this.isCKExpanded = false;
      this.masterTrainingType = '';
      this.qaPairs = [{ question: '', answer: '' }];
      Swal.fire({
        icon: 'success',
        title: 'Master AI Updated!',
        confirmButtonColor: '#DD1977',
        timer: 1500,
        showConfirmButton: false
      });
    }).catch(() => alert('❌ Save failed'));
  }

  changeMasterType() {
    this.sessionExtractedText = '';
    this.masterTrainingType = '';
    this.masterUploadedFiles = [];
    this.websiteUrl = '';
    this.isFetchingUrl = false;
    this.filledQAPairs = [];
    this.qaPairs = [{ question: '', answer: '' }]; // ✅ Reset
    if (this.ckEditorInstance) {
      this.ckEditorInstance.destroy();
      this.ckEditorInstance = null;
    }
    this.cdr.detectChanges();
  }

  // ✅ Clear extracted text
  clearMasterText() {
    if (confirm('Clear all extracted content?')) {
      this.masterTrainingText = '';
      this.sessionExtractedText = '';
      this.masterUploadedFiles = [];
      this.cdr.detectChanges();
    }
  }

  // ✅ Trigger file upload for file mode
  triggerMasterFileUpload() {
    setTimeout(() => { this.masterFileInput.nativeElement.click(); }, 0);
  }

  // ✅ Handle drag over
  onDragOver(event: any) {
    event.preventDefault();
    event.stopPropagation();
  }

  // ✅ Handle file drop
  onFileDrop(event: any) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.processUploadedFile(files[i]);
      }
    }
  }

  // ✅ Handle file input for file mode
  onMasterFileUpload(event: any) {
    const files = event.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      this.processUploadedFile(files[i]);
    }
    event.target.value = '';
  }

  // ✅ Process each uploaded file — send to backend
  processUploadedFile(file: File) {
    const fileEntry = { name: file.name, loading: true, done: false };
    this.masterUploadedFiles.push(fileEntry);
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('file', file);

    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/extract-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      const text = res.data.text || '';
      const lines = text.split('\n').filter((l: string) => l.trim() !== '');
      const htmlContent = `<p><strong>--- From: ${file.name} ---</strong></p>` +
        lines.map((l: string) => `<p>${l}</p>`).join('');
      this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;
      this.sessionExtractedText = (this.sessionExtractedText || '') + htmlContent;
      fileEntry.loading = false;
      fileEntry.done = true;
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('File extract error:', err);
      fileEntry.loading = false;
      fileEntry.done = false;
      this.cdr.detectChanges();
    });
  }

  // ✅ Remove file from master list
  removeMasterFile(index: number) {
    this.masterUploadedFiles.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ✅ Fetch website content
  async fetchWebsiteContent() {
    if (!this.websiteUrl || !this.websiteUrl.trim()) return;

    this.isFetchingUrl = true;
    this.cdr.detectChanges();

    try {
      const res = await axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/fetch-url', {
        url: this.websiteUrl
      });

      const text = res.data.text || '';
      const lines = text.split('\n').filter((l: string) => l.trim() !== '');
      this.masterTrainingText = `<p><strong>--- From website: ${this.websiteUrl} ---</strong></p>` +
        lines.map((l: string) => `<p>${l}</p>`).join('');
      this.sessionExtractedText = this.masterTrainingText;
      this.isFetchingUrl = false;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('URL fetch error:', err);
      this.isFetchingUrl = false;
      Swal.fire({
        icon: 'error',
        title: 'Failed to fetch website',
        text: 'Please check the URL and try again.',
        confirmButtonColor: '#DD1977'
      });
      this.cdr.detectChanges();
    }
  }

  handleCKFileUpload(file: File) {
    const fileName = file.name.toLowerCase();

    const insertToEditor = (htmlContent: string) => {
      if (this.activeEditor) {
        const currentData = this.activeEditor.getData();
        this.activeEditor.setData(currentData + htmlContent);
        this.masterTrainingText = this.activeEditor.getData();
      } else {
        this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;
      }
      this.uploadedFiles.push({ name: file.name });
      this.cdr.detectChanges();
    };

    const formData = new FormData();
    formData.append('file', file);

    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/extract-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      const text = res.data.text || '';
      const lines = text.split('\n').filter((l: string) => l.trim() !== '');
      const htmlContent = `<p><strong>--- From: ${file.name} ---</strong></p>` +
        lines.map((l: string) => `<p>${l}</p>`).join('');
      insertToEditor(htmlContent);
    }).catch(err => {
      console.error('File extract error:', err);
      insertToEditor(`<p><strong>--- From: ${file.name} ---</strong></p><p>[Failed to extract content]</p>`);
    });
  }

  toggleCKExpand() {
    this.isCKExpanded = !this.isCKExpanded;
    this.cdr.detectChanges();

    if (this.isCKExpanded) {
      setTimeout(() => {
        const el = document.getElementById('master-editor-fullscreen');
        if (!el || !(window as any).ClassicEditor) return;
        (window as any).ClassicEditor.create(el, {
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'bulletedList', 'numberedList', '|',
            'blockQuote', 'insertTable', '|',
            'undo', 'redo', '|',
            'voiceInput', 'fileUpload', 'clearContent', 'expandEditor'
          ],
          initialData: this.masterTrainingText || ''
        }).then((editor: any) => {
          this.ckEditorFullscreen = editor;
          editor.model.document.on('change:data', () => {
            this.masterTrainingText = editor.getData();
            if (this.ckEditorInstance) {
              this.ckEditorInstance.setData(this.masterTrainingText);
            }
            this.cdr.detectChanges();
          });
        });
      }, 200);
    } else {
      if (this.ckEditorFullscreen) {
        const data = this.ckEditorFullscreen.getData();
        this.masterTrainingText = data;
        if (this.ckEditorInstance) {
          this.ckEditorInstance.setData(data);
        }
        this.ckEditorFullscreen.destroy();
        this.ckEditorFullscreen = null;
      }
    }
  }

  closeCKExpand(event: any) {
    if (event.target.classList.contains('ck-fullscreen-overlay')) {
      if (this.ckEditorFullscreen) {
        this.ckEditorFullscreen.destroy();
        this.ckEditorFullscreen = null;
      }
      this.isCKExpanded = false;
      this.cdr.detectChanges();
    }
  }

  loadTrainingData() {
    const userId = this.user?.user_id;
    axios.get(`https://aiemployeeplatform.leadsfactory.info/api/ai/train/${userId}`)
      .then(res => {
        if (res.data && res.data.training_data) {
          this.originalTrainingText = res.data.training_data;
          this.trainingText = res.data.training_data;
          this.isTrained = true;
        }
        if (res.data && res.data.master_data) {
          this.masterTrainingText = res.data.master_data;
        }
      })
      .catch(err => {
        console.error('Error loading training data', err);
        this.isTrained = false;
      });
  }

  loadDashboardStats() {
    const userId = this.user?.user_id;
    axios.get(`https://aiemployeeplatform.leadsfactory.info/api/ai/dashboard/stats/${userId}`)
      .then(res => {
        this.totalConversations = res.data.totalConversations;
        this.totalClients = res.data.totalClients;
        // ✅ Lead type counts (Hot 8-10, Warm 5-7, Cold 1-4)
        this.leadHot = res.data.leadHot || 0;
        this.leadWarm = res.data.leadWarm || 0;
        this.leadCold = res.data.leadCold || 0;
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Stats error:', err));
  }

  loadQuestions() {
    this.questions = [
      // ✅ AI Identity
      { id: 'ai_employee_name', section: 'AI Identity', question: 'AI Employee Name', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: Kavi / Meena / AI Sales Assistant', value: '' },
      { id: 'ai_employee_gender', section: 'AI Identity', question: 'AI Employee Gender', fieldType: 'radio', options: ['Male', 'Female', 'Neutral'], mandatory: true, placeholder: '', value: '' },
      { id: 'ai_goal', section: 'AI Identity', question: 'AI Goal', fieldType: 'textarea', options: [], mandatory: true, placeholder: 'Example: Generate leads, answer customer questions, explain products, collect customer details, book appointments', value: '' },
      { id: 'customer_addressing_style', section: 'AI Identity', question: 'How should the AI address customers?', fieldType: 'dropdown', options: ['Friend', 'Boss', 'Thalaivare', 'Dear Customer', 'By Customer Name'], mandatory: true, placeholder: '', value: '' },
      { id: 'ai_introduction_script', section: 'AI Identity', question: 'AI Introduction Script', fieldType: 'textarea', options: [], mandatory: true, placeholder: 'Hi, I am {AI Name}, AI Assistant for {Company Name}. How can I help you today?', value: '' },
      { id: 'can_suggest_tips', section: 'AI Identity', question: 'Can AI suggest starting tips to customers?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'communication_style', section: 'AI Identity', question: 'Communication Style', fieldType: 'dropdown', options: ['Professional', 'Friendly', 'Practical', 'Local Language Style', 'Premium Business Style', 'Sales-Oriented', 'Support-Oriented'], mandatory: true, placeholder: '', value: '' },
      { id: 'response_length', section: 'AI Identity', question: 'How should AI reply?', fieldType: 'dropdown', options: ['Very Short', 'Short', 'Medium', 'Detailed'], mandatory: true, placeholder: '', value: 'Short' },
      { id: 'non_business_talk_allowed', section: 'AI Identity', question: 'Can AI speak about topics not related to business?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'No' },

      // ✅ Business Information
      { id: 'business_name', section: 'Business Information', question: 'Business Name', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: ABC Insurance Service', value: '' },
      { id: 'business_category', section: 'Business Information', question: 'Business Category', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: Insurance / Real Estate / Clinic', value: '' },
      { id: 'business_description', section: 'Business Information', question: 'Business Description', fieldType: 'textarea', options: [], mandatory: true, placeholder: 'Write 3–5 lines about your business', value: '' },
      { id: 'product_service_1', section: 'Business Information', question: 'Product or Service 1', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: Health Insurance', value: '' },
      { id: 'product_service_2', section: 'Business Information', question: 'Product or Service 2', fieldType: 'text', options: [], mandatory: false, placeholder: 'Example: Life Insurance', value: '' },
      { id: 'product_service_3', section: 'Business Information', question: 'Product or Service 3', fieldType: 'text', options: [], mandatory: false, placeholder: 'Example: Vehicle Insurance', value: '' },
      { id: 'product_service_4', section: 'Business Information', question: 'Product or Service 4', fieldType: 'text', options: [], mandatory: false, placeholder: 'Example: Claim Support', value: '' },
      { id: 'business_location', section: 'Business Information', question: 'Business Location / Service Area', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: Coimbatore / All Tamil Nadu', value: '' },
      { id: 'business_website', section: 'Business Information', question: 'Website / Social Media URL', fieldType: 'url', options: [], mandatory: false, placeholder: 'https://example.com', value: '' },
      { id: 'business_whatsapp', section: 'Business Information', question: 'Business WhatsApp Number', fieldType: 'phone', options: [], mandatory: true, placeholder: 'Example: +91 98765 43210', value: '' },
      { id: 'business_email', section: 'Business Information', question: 'Business Email', fieldType: 'email', options: [], mandatory: false, placeholder: 'info@example.com', value: '' },
      {
        id: 'business_app_password',
        section: 'Business Information',
        question: 'Google App Password',
        fieldType: 'password',
        options: [],
        mandatory: false,
        placeholder: 'xxxx xxxx xxxx xxxx',
        value: ''
      },

      // ✅ Working Hours
      { id: 'working_days', section: 'Working Hours', question: 'Working Days', fieldType: 'checkbox', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], mandatory: true, placeholder: '', value: [] },
      { id: 'office_open_time', section: 'Working Hours', question: 'Office Opening Time', fieldType: 'time', options: [], mandatory: true, placeholder: '09:30', value: '' },
      { id: 'office_close_time', section: 'Working Hours', question: 'Office Closing Time', fieldType: 'time', options: [], mandatory: true, placeholder: '18:30', value: '' },
      { id: 'holiday_response', section: 'Working Hours', question: 'Holiday / After-hours Response Message', fieldType: 'textarea', options: [], mandatory: false, placeholder: 'Thanks for contacting us. Our office is currently closed. We will respond during working hours.', value: '' },

      // ✅ Customer Handling
      { id: 'max_chat_duration', section: 'Customer Handling', question: 'Maximum time AI can talk/chat to one customer', fieldType: 'dropdown', options: ['3 Minutes', '5 Minutes', '10 Minutes', 'No Limit'], mandatory: true, placeholder: '', value: '5 Minutes' },
      { id: 'max_messages_before_transfer', section: 'Customer Handling', question: 'Maximum messages before transfer to human', fieldType: 'dropdown', options: ['5 Messages', '10 Messages', '20 Messages', 'No Limit'], mandatory: true, placeholder: '', value: '10 Messages' },
      { id: 'collect_contact', section: 'Customer Handling', question: 'Should AI collect customer contact details?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'collect_location', section: 'Customer Handling', question: 'Should AI collect customer location?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: false, placeholder: '', value: 'Yes' },
      { id: 'qualify_lead', section: 'Customer Handling', question: 'Should AI qualify leads before transfer?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'schedule_appointment', section: 'Customer Handling', question: 'Can AI schedule appointments?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'ask_budget', section: 'Customer Handling', question: 'Can AI ask customer budget range?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: false, placeholder: '', value: 'Yes' },
      { id: 'ask_urgency', section: 'Customer Handling', question: 'Can AI ask customer urgency/timeline?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },

      // ✅ Human Escalation
      { id: 'responsible_person_required', section: 'Human Escalation', question: 'Need responsible person mobile number?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'responsible_person_name', section: 'Human Escalation', question: 'Responsible Person Name', fieldType: 'text', options: [], mandatory: true, placeholder: 'Example: Sales Manager', value: '' },
      { id: 'responsible_person_mobile', section: 'Human Escalation', question: 'Responsible Person Mobile Number', fieldType: 'phone', options: [], mandatory: true, placeholder: 'Example: +91 98765 43210', value: '' },
      { id: 'backup_person_name', section: 'Human Escalation', question: 'Backup Responsible Person Name', fieldType: 'text', options: [], mandatory: false, placeholder: 'Example: Office Admin', value: '' },
      { id: 'backup_person_mobile', section: 'Human Escalation', question: 'Backup Mobile Number', fieldType: 'phone', options: [], mandatory: false, placeholder: 'Example: +91 98765 43210', value: '' },
      { id: 'transfer_rules', section: 'Human Escalation', question: 'Transfer customer to human when', fieldType: 'checkbox', options: ['Customer asks price negotiation', 'Customer asks technical question', 'Customer asks for owner', 'Customer requests callback', 'Customer wants appointment', 'Customer is angry', 'Customer complaint received', 'Customer ready to buy', 'AI unable to answer', 'Payment issue', 'Legal/medical/financial sensitive question'], mandatory: true, placeholder: '', value: [] },

      // ✅ Greetings
      { id: 'closing_style', section: 'Greetings', question: 'End Conversation Style', fieldType: 'dropdown', options: ['Thanks for Contacting Us', 'Have a Great Day', 'Looking Forward to Serving You', 'Happy Investing', 'Happy Shopping', 'Happy Learning', 'Safe Travels', 'Healthy Living', 'Custom Closing Message'], mandatory: true, placeholder: '', value: 'Thanks for Contacting Us' },

      // ✅ AI Rules
      { id: 'can_share_pricing', section: 'AI Rules', question: 'Can AI share pricing?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'can_share_offers', section: 'AI Rules', question: 'Can AI share offers/discounts?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'can_share_owner_contact', section: 'AI Rules', question: 'Can AI share owner contact details?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'No' },
      { id: 'can_repeat_customer_name', section: 'AI Rules', question: 'Can AI call customer by name repeatedly?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: false, placeholder: '', value: 'No' },
      { id: 'auto_followup', section: 'AI Rules', question: 'Can AI follow up automatically?', fieldType: 'yes_no', options: ['Yes', 'No'], mandatory: true, placeholder: '', value: 'Yes' },
      { id: 'followup_frequency', section: 'AI Rules', question: 'Follow-up Frequency', fieldType: 'dropdown', options: ['Same Day', 'Daily', 'Every 2 Days', 'Every 3 Days', 'Weekly', 'Custom'], mandatory: false, placeholder: '', value: 'Every 2 Days' },
      { id: 'additional_ai_instructions', section: 'AI Rules', question: 'Additional Instructions to AI', fieldType: 'textarea', options: [], mandatory: false, placeholder: 'Always be polite. Never argue. Focus on converting leads into appointments.', value: '' },
    ];
    this.currentSectionIndex = 0;
    this.cdr.detectChanges();
  }

  isAllSelected(q: TrainingQuestion): boolean {
    return Array.isArray(q.value) && q.value.length === q.options.length;
  }

  getFilledQAPairs(): { question: string; answer: string }[] {
    return this.filledQAPairs;
  }

  getMasterPreviewText(): string {
    if (!this.masterTrainingText) return '';
    return this.masterTrainingText.replace(/<[^>]*>/g, '');
  }


  toggleSelectAll(q: TrainingQuestion) {
    if (!Array.isArray(q.value)) q.value = [];
    if (this.isAllSelected(q)) {
      q.value = [];
    } else {
      q.value = [...q.options];
    }
    this.cdr.detectChanges();
  }

  goBackToDashboard() {
    this.filledQAPairs = [];
    this.sessionExtractedText = '';
    this.showTrainBox = false;
    this.showQuestionnaire = false;
    this.isCKExpanded = false;
    this.masterTrainingType = '';
    this.masterUploadedFiles = [];
    this.websiteUrl = '';
    this.isFetchingUrl = false;
    this.qaPairs = [{ question: '', answer: '' }]; // ✅ Reset
    if (this.ckEditorInstance) {
      this.ckEditorInstance.destroy();
      this.ckEditorInstance = null;
    }
    if (this.ckEditorFullscreen) {
      this.ckEditorFullscreen.destroy();
      this.ckEditorFullscreen = null;
    }
  }

  clearMaster() {
    if (confirm('Clear all master training data?')) {
      this.masterTrainingText = '';
    }
  }

  triggerFileUpload() {
    setTimeout(() => { this.fileInput.nativeElement.click(); }, 0);
  }

  triggerImageUpload() {
    this.imageInput.nativeElement.click();
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const imageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const isImage = imageTypes.some(ext => fileName.endsWith(ext));
    const isPdf = fileName.endsWith('.pdf');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const htmlContent = `<p><strong>--- Image uploaded: ${file.name} ---</strong></p><p>[Image: ${file.name}]</p>`;
        this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;
        this.uploadedFiles.push({ name: file.name });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    } else if (isPdf || isExcel) {
      const htmlContent = `<p><strong>--- From file: ${file.name} ---</strong></p><p>[File content from: ${file.name} - Please add details manually or use text files for best results]</p>`;
      this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;
      this.uploadedFiles.push({ name: file.name });
      this.cdr.detectChanges();
    } else {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const content = e.target.result as string;
        const htmlContent = `<p><strong>--- From file: ${file.name} ---</strong></p><p>${content.replace(/\n/g, '</p><p>')}</p>`;
        this.masterTrainingText = (this.masterTrainingText || '') + htmlContent;
        this.uploadedFiles.push({ name: file.name });
        this.cdr.detectChanges();
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  }

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedImages.push({ name: file.name, preview: e.target.result });
      this.masterTrainingText += (this.masterTrainingText ? '\n\n' : '') +
        `--- Image uploaded: ${file.name} ---\n[Image content noted]`;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeFile(index: number) { this.uploadedFiles.splice(index, 1); }
  removeImage(index: number) { this.uploadedImages.splice(index, 1); }
  saveMasterAndClose() { this.toggleExpand(); this.saveMasterAI(); }

  async onLangChange() {
    if (this.selectedLang === 'en') {
      this.loadQuestions();
      return;
    }
    this.isTranslating = true;
    this.cdr.detectChanges();
    try {
      const texts = this.questions.map(q => q.question);
      const translated = await this.langService.translate(texts, this.selectedLang);
      translated.forEach((t, i) => { this.questions[i].question = t; });
      this.currentSectionIndex = 0;
    } catch (err) {
      console.error('Translation error:', err);
    }
    this.isTranslating = false;
    this.cdr.detectChanges();
  }

  async onLangChangeTrainBox() {
    const sourceText = this.originalTrainingText || this.trainingText;
    if (!sourceText) return;
    if (this.selectedLang === 'en') { this.trainingText = sourceText; return; }
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

  startTraining() {
    if (this.isTrained) { this.showTrainBox = true; }
    else { this.showQuestionnaire = true; }
  }

  startBasicTraining() {
    this.loadQuestions();
    this.currentSectionIndex = 0;
    this.showTrainBox = false;
    this.showQuestionnaire = true;
    if (this.isTrained && this.originalTrainingText) {
      this.populateQuestionsFromTrainingData(this.originalTrainingText);
    }
    this.cdr.detectChanges();
  }

  populateQuestionsFromTrainingData(trainingData: string) {
    const lines = trainingData.split('\n');
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (!value) return;
      const question = this.questions.find(q => q.question === key);
      if (!question) return;
      if (question.fieldType === 'checkbox') {
        question.value = value.split(',').map(v => v.trim()).filter(v => v !== '');
      } else if (question.fieldType === 'time') {
        question.value = value; // "09:30"
        this.populateTimeDropdowns(question, value); // ✅ NEW
      } else {
        question.value = value;
      }
    });
    this.cdr.detectChanges();
  }

  // ✅ NEW METHOD - convert 24hr "HH:MM" into dropdown values
  populateTimeDropdowns(q: TrainingQuestion, value: string) {
    const parts = value.split(':');
    if (parts.length !== 2) return;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];

    let amPm = 'AM';
    if (hour === 0) {
      hour = 12;
      amPm = 'AM';
    } else if (hour === 12) {
      amPm = 'PM';
    } else if (hour > 12) {
      hour = hour - 12;
      amPm = 'PM';
    }

    q.valueHour = hour.toString().padStart(2, '0');
    q.valueMinute = this.minuteOptions.includes(minute) ? minute : minute.padStart(2, '0');
    q.valueAmPm = amPm;
  }

  startMasterTraining() {
    this.sessionExtractedText = '';
    this.showQuestionnaire = false;
    this.showTrainBox = true;
    this.masterTrainingType = ''; // ✅ Always show type selector first
    this.masterUploadedFiles = [];
    this.websiteUrl = '';
    this.isFetchingUrl = false;
    this.isCKExpanded = false;
    this.selectedLang = 'en';
    this.cdr.detectChanges();
  }

  initCKEditor() {
    if (this.ckRetryCount > 3) {
      console.error('❌ CKEditor failed after 3 retries — using fallback textarea');
      this.ckRetryCount = 0;
      return;
    }

    const editorEl = document.getElementById('master-editor');

    if (!editorEl) {
      this.ckRetryCount++;
      setTimeout(() => this.initCKEditor(), 500);
      return;
    }

    if (!(window as any).ClassicEditor) {
      this.loadCKEditorScript(() => {
        this.ckRetryCount++;
        setTimeout(() => this.initCKEditor(), 500);
      });
      return;
    }

    this.ckRetryCount = 0;
    editorEl.innerHTML = '';
    this.createEditor(editorEl);
  }

  loadCKEditorScript(callback: () => void) {
    if (document.querySelector('script[src*="ckeditor.js"]')) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'assets/ckeditor/ckeditor.js';
    script.onload = () => {
      callback();
    };
    script.onerror = () => {
      console.error('❌ Failed to load ckeditor.js from assets');
      callback();
    };
    document.body.appendChild(script);
  }

  createEditor(editorEl: HTMLElement) {
    (window as any).ClassicEditor.create(editorEl, {
      toolbar: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'bulletedList', 'numberedList', '|',
        'blockQuote', 'insertTable', '|',
        'undo', 'redo', '|',
        'voiceInput', 'fileUpload', 'clearContent', 'expandEditor'
      ],
      initialData: this.masterTrainingText || ''
    }).then((editor: any) => {
      this.ckEditorInstance = editor;
      editor.model.document.on('change:data', () => {
        this.masterTrainingText = editor.getData();
        this.cdr.detectChanges();
      });
    }).catch((err: any) => {
      console.error('❌ CKEditor init error:', err);
    });
  }

  async finishQuestionnaire() {
    const trainingParts: string[] = [];
    this.questions.forEach(q => {
      let answer = '';
      if (q.fieldType === 'checkbox') {
        answer = Array.isArray(q.value) ? q.value.join(', ') : '';
      } else {
        answer = q.value || '';
      }
      if (answer) {
        // Don't save App Password inside AI training data
        if (q.id !== 'business_app_password') {
          trainingParts.push(`${q.question}: ${answer}`);
        }
      }
    });

    this.trainingText = trainingParts.join('\n');
    this.originalTrainingText = this.trainingText;
    this.showQuestionnaire = false;

    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/train', {

      userId: this.user.user_id,
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      trainingData: this.originalTrainingText,

      businessEmail:
        this.questions.find(x => x.id === 'business_email')?.value || '',

      businessAppPassword:
        (this.questions.find(x => x.id === 'business_app_password')?.value || '')
          .replace(/\s/g, '')


    }).then(() => {
      this.isTrained = true;
      Swal.fire({
        icon: 'success',
        title: '🎉 Basic AI Employee is Ready!',
        html: `
          <p>Your AI Employee is trained and ready to work!</p>
          <p style="margin-top: 10px; font-size: 13px; color: #888;">Your shareable link is available on the dashboard.</p>
          <div style="margin-top: 16px; background: #fff8e1; border-left: 4px solid #DD1977; padding: 10px 14px; border-radius: 6px; text-align: left;">
              <p style="margin: 0; font-size: 13px; color: #e65100;">
                  ⚠️ <strong>Note:</strong> Only Basic Training is completed.<br>
                  For better AI performance, please also train <strong>Master AI Employee</strong> with detailed business data.
              </p>
          </div>
        `,
        confirmButtonText: 'Go to Dashboard',
        confirmButtonColor: '#DD1977',
        allowOutsideClick: false
      }).then(() => window.location.reload());
    }).catch((err) => {

      console.log('Training Error:', err);

      if (err.response && err.response.data && err.response.data.message) {

        Swal.fire({
          icon: 'error',
          title: 'Training Failed',
          text: err.response.data.message,
          confirmButtonColor: '#DD1977'
        });

      } else {

        Swal.fire({
          icon: 'error',
          title: 'Training Failed',
          text: 'Something went wrong. Please try again.',
          confirmButtonColor: '#DD1977'
        });

      }

    });

  }

  copyLink() {
    const link = `https://aiemployeeplatform.leadsfactory.info/user/${this.user.user_id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        Swal.fire({ icon: 'success', title: 'Link Copied!', timer: 1000, showConfirmButton: false, confirmButtonColor: '#DD1977' });
      }).catch(() => this.fallbackCopy(link));
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
      Swal.fire({ icon: 'success', title: 'Link Copied!', timer: 1000, showConfirmButton: false, confirmButtonColor: '#DD1977' });
    } catch (err) {
      Swal.fire({ icon: 'info', title: 'Copy manually:', text, confirmButtonColor: '#DD1977' });
    }
    document.body.removeChild(textArea);
  }

  trainAI() {
    if (!this.trainingText.trim()) { alert('Please enter training data'); return; }
    const dataToSave = this.trainingText;
    this.originalTrainingText = this.trainingText;


    const businessEmail =
      this.questions.find(x => x.id === 'business_email')?.value || '';

    const businessAppPassword =
      (
        this.questions.find(x => x.id === 'business_app_password')?.value || ''
      )
        .replace(/\s/g, '');



    console.log("BUSINESS EMAIL:", businessEmail);

    console.log("APP PASSWORD:", businessAppPassword);

    console.log("PASSWORD LENGTH:", businessAppPassword.length);
    console.log("FINAL TRAIN DATA:", {
      businessEmail: businessEmail,
      businessAppPassword: businessAppPassword,
      passwordLength: businessAppPassword.length
    });

    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/train', {

      userId: this.user.user_id,

      name: this.user.name,

      email: this.user.email,

      mobile: this.user.mobile,

      trainingData: dataToSave,

      businessEmail: businessEmail,

      businessAppPassword: businessAppPassword

    }).then(() => {
      this.isTrained = true; this.isEditing = false;
      this.showTrainBox = false; this.showQuestionnaire = false;
      Swal.fire({ icon: 'success', title: 'AI Updated Successfully!', confirmButtonColor: '#DD1977', timer: 1500, showConfirmButton: false });
    }).catch(() => alert('❌ Training failed'));
  }

  saveMasterAI() {
    if (this.activeEditor) {
      this.masterTrainingText = this.activeEditor.getData();
    }
    if (!this.masterTrainingText || !this.masterTrainingText.trim()) {
      alert('Please enter master training data'); return;
    }
    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/train/master', {
      userId: this.user.user_id, masterData: this.masterTrainingText
    }).then(() => {
      this.showTrainBox = false;
      this.isCKExpanded = false;
      this.masterTrainingType = '';
      if (this.ckEditorInstance) {
        this.ckEditorInstance.destroy();
        this.ckEditorInstance = null;
      }
      if (this.ckEditorFullscreen) {
        this.ckEditorFullscreen.destroy();
        this.ckEditorFullscreen = null;
      }
      Swal.fire({ icon: 'success', title: 'Master AI Updated!', confirmButtonColor: '#DD1977', timer: 1500, showConfirmButton: false });
    }).catch(() => alert('❌ Save failed'));
  }

  updateAIFromExpand() {
    if (!this.trainingText.trim()) { alert('Please enter training data'); return; }
    this.isExpanded = false;
    this.originalTrainingText = this.trainingText;
    axios.post('https://aiemployeeplatform.leadsfactory.info/api/ai/train', {
      userId: this.user.user_id, name: this.user.name, email: this.user.email,
      mobile: this.user.mobile, trainingData: this.trainingText
    }).then(() => {
      this.isTrained = true; this.isEditing = false;
      Swal.fire({ icon: 'success', title: 'AI Updated Successfully!', confirmButtonColor: '#DD1977' })
        .then(() => window.location.reload());
    }).catch(() => alert('❌ Training failed'));
  }

  startListening() {
    if (this.isListening) { this.stopListening(); return; }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Swal.fire({ icon: 'error', title: 'Not Supported', text: 'Please use Google Chrome browser for voice feature.', confirmButtonColor: '#DD1977' });
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
          this.recognition.onstart = () => { this.isListening = true; this.cdr.detectChanges(); };
          this.recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (this.activeEditor) {
              const currentData = this.activeEditor.getData();
              this.activeEditor.setData(currentData + ' ' + transcript);
            } else {
              this.masterTrainingText = this.masterTrainingText
                ? this.masterTrainingText + ' ' + transcript
                : transcript;
            }
            this.cdr.detectChanges();
            if (this.isListening) {
              try { this.recognition.start(); } catch (e) { }
            }
          };
          this.recognition.onerror = (event: any) => { this.isListening = false; this.cdr.detectChanges(); };
          this.recognition.onend = () => {
            if (this.isListening) { try { this.recognition.start(); } catch (e) { this.isListening = false; this.cdr.detectChanges(); } }
            else { this.cdr.detectChanges(); }
          };
          this.recognition.start();
        } catch (err) { this.isListening = false; this.cdr.detectChanges(); }
      })
      .catch(() => {
        Swal.fire({
          icon: 'warning', title: 'Microphone Permission Denied',
          html: `<ol style="text-align:left; padding-left: 20px;"><li>Click the 🔒 icon in the address bar</li><li>Click <b>"Site settings"</b></li><li>Set <b>Microphone</b> to <b>Allow</b></li><li>Refresh the page and try again</li></ol>`,
          confirmButtonColor: '#DD1977'
        });
      });
  }

  stopListening() {
    this.isListening = false;
    this.cdr.detectChanges();
    if (this.recognition) { this.recognition.stop(); this.recognition = null; }
  }

  enableEdit() {
    this.isEditing = true;
    this.trainingText = this.originalTrainingText;
    this.selectedLang = 'en';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']).then(() => {
      window.location.href = '/login';
    });
  }

  Clients() { this.router.navigate(['/clients']); }
  BasicQuestions() { this.router.navigate(['/basic-questions']); }
  Chat() { this.router.navigate(['/chat']); }
  Settings() { this.router.navigate(['/settings']); }
}
