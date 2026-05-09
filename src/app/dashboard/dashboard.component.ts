import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
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
  recognition: any;

  showQuestionnaire: boolean = false;
  showTrainBox: boolean = false;
  currentQuestionIndex: number = 0;

  ui: any = {
    welcome: 'Welcome back 👋',
    totalConversations: 'Total Conversations',
    leadsGenerated: 'Leads Generated',
    hotLeads: 'Hot Leads',
    aiAccuracy: 'AI Accuracy',
    dashboard: 'Dashboard',
    chat: 'Chat',
    settings: 'Settings',
    logout: 'Logout',
    trainBtn: '🧠 Basic Training for Your AI Employee',
    editTrainBtn: '✏️ Edit AI Training',
    trainTitle: '🧠 Train Your AI Employee',
    trainSub: 'Choose the correct answers — you can select multiple options per question',
    question: 'Question',
    of: 'of',
    previous: '← Previous',
    next: 'Next →',
    finish: '✅ Finish & Review',
    redoBtn: '← Redo Questions',
    placeholder: 'Describe your business, services, pricing...',
    speak: '🎤 Speak',
    stopListening: '🛑 Stop Listening',
    listeningMsg: '🔴 Listening... speak now, click Stop when done',
    saveBtn: 'Save & Train AI',
    updateBtn: 'Update AI',
    editBtn: '✏ Edit',
    specifyPlaceholder: 'Please specify...'
  };

  originalQuestions: TrainingQuestion[] = [
    {
      question: 'What type of business do you run?',
      options: ['IT / Software', 'Retail / E-commerce', 'Healthcare', 'Education', 'Real Estate', 'Finance / Accounting', 'Marketing / Agency', 'Manufacturing', 'Restaurant / Food', 'Others'],
      selectedOptions: [], othersText: ''
    },
    {
      question: 'What are your main services or products?',
      options: ['Website Development', 'Mobile App Development', 'Digital Marketing / SEO', 'Product Sales', 'Consulting / Advisory', 'Training / Courses', 'Support / Maintenance', 'Design Services', 'Cloud / Hosting', 'Others'],
      selectedOptions: [], othersText: ''
    },
    // {
    //   question: 'Who are your target customers?',
    //   options: ['Small Businesses', 'Large Enterprises', 'Individual Consumers', 'Students', 'Startups', 'Government / NGO', 'Freelancers', 'Healthcare Professionals', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What is your pricing model?',
    //   options: ['Fixed Project Price', 'Monthly Subscription', 'Hourly Rate', 'Freemium (Free + Paid)', 'Commission Based', 'Pay Per Use', 'Custom Quotation', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What is your approximate price range?',
    //   options: ['Under ₹5,000', '₹5,000 – ₹20,000', '₹20,000 – ₹50,000', '₹50,000 – ₹1,00,000', 'Above ₹1,00,000', 'Varies by Project', 'Free / Open Source', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What are your working hours?',
    //   options: ['9 AM – 6 PM (Mon–Fri)', '9 AM – 6 PM (Mon–Sat)', '9 AM – 6 PM (Mon–Sun)', '24/7 Support Available', 'Flexible / By Appointment', 'Morning Only', 'Evening Only', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'Where is your business located or which regions do you serve?',
    //   options: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Pan India', 'South India Only', 'International Clients', 'Online / Remote Only', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'How can customers contact you?',
    //   options: ['WhatsApp', 'Phone Call', 'Email', 'Website Contact Form', 'Social Media (Instagram / Facebook)', 'Walk-in / Office Visit', 'Video Call (Zoom / Meet)', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What makes your business stand out from competitors?',
    //   options: ['Years of Experience (5+ years)', 'Large Client Base (200+ clients)', '24/7 Customer Support', 'Free Consultation', 'Fast Delivery', 'Affordable Pricing', 'Certified / Award Winning', 'Custom Solutions', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'How does your onboarding process work for new customers?',
    //   options: ['Free Consultation → Proposal → Payment → Delivery', 'Direct Purchase Online', 'Demo / Trial First', 'Site Visit → Quote → Work Begins', 'Registration → Account → Usage', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'Do you have any current offers or promotions?',
    //   options: ['10% Off First Order', '20% Off First Project', 'Free Logo with Website', 'Free 1-Month Support', 'Referral Discount', 'Seasonal Sale Running', 'No Current Offers', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'In which languages should the AI respond to customers?',
    //   options: ['English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What tone should the AI use when talking to customers?',
    //   options: ['Friendly & Casual', 'Professional & Formal', 'Energetic & Enthusiastic', 'Calm & Supportive', 'Short & Direct', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What should the AI NOT say or promise to customers?',
    //   options: ['Do not promise delivery under 7 days', 'Do not discuss competitor pricing', 'Do not offer discounts without approval', 'Do not share internal pricing', 'Do not make refund commitments', 'No restrictions', 'Others'],
    //   selectedOptions: [], othersText: ''
    // },
    // {
    //   question: 'What are the most common questions your customers ask?',
    //   options: ['Do you offer refunds?', 'How long does delivery take?', 'Do you provide after-sales support?', 'Can I see a demo first?', 'Do you have a physical office?', 'Are you available on weekends?', 'Others'],
    //   selectedOptions: [], othersText: ''
    // }
  ];

  questions: TrainingQuestion[] = this.originalQuestions.map(q => ({
    ...q, selectedOptions: [], othersText: ''
  }));

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private langService: LanguageService
  ) { }

  get currentQuestion(): TrainingQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  async ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadTrainingData();

        // ✅ Get lang directly from user object
        const lang = this.user.lang || 'en';
        console.log('Current lang:', lang);

        if (lang !== 'en') {
          this.translatePage(lang);
        }
      }
    }
  }

  async translatePage(lang: string) {
    try {
      this.isTranslating = true;
      this.cdr.detectChanges();

      // ✅ Translate UI object
      const uiKeys = Object.keys(this.ui);
      const uiValues = Object.values(this.ui) as string[];
      const translatedUi = await this.langService.translate(uiValues, lang);
      uiKeys.forEach((key, i) => this.ui[key] = translatedUi[i]);

      // ✅ Translate questions + options
      const qTexts = this.originalQuestions.map(q => q.question);
      const oTexts = this.originalQuestions.flatMap(q => q.options);
      const allTranslated = await this.langService.translate([...qTexts, ...oTexts], lang);

      const qCount = qTexts.length;
      this.questions = this.originalQuestions.map((q, qi) => {
        let optOffset = qCount;
        for (let j = 0; j < qi; j++) optOffset += this.originalQuestions[j].options.length;
        return {
          ...q,
          question: allTranslated[qi],
          options: q.options.map((_, oi) => allTranslated[optOffset + oi]),
          selectedOptions: [],
          othersText: ''
        };
      });

      this.isTranslating = false;
      this.cdr.detectChanges();

    } catch (err) {
      console.error('Translation error:', err);
      this.isTranslating = false;
      this.cdr.detectChanges();
    }
  }

  loadTrainingData() {
    axios.get(`http://localhost:3000/api/ai/train/${this.user.id}`)
      .then(res => {
        if (res.data && res.data.training_data) {
          this.trainingText = res.data.training_data;
          this.isTrained = true;
        }
      })
      .catch(err => console.error('Error loading training data', err));
  }

  startTraining() {
    if (this.isTrained) {
      this.showTrainBox = true;
    } else {
      this.showQuestionnaire = true;
    }
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

  finishQuestionnaire() {
    this.buildTrainingData();
    this.showQuestionnaire = false;
    this.showTrainBox = true;
  }

  buildTrainingData() {
    const parts: string[] = [];
    this.questions.forEach((q, qi) => {
      if (q.selectedOptions.length === 0) return;

      // ✅ Use translated question if available, else original
      const displayQuestion = q.question; // already translated

      let answers = q.selectedOptions.map((sel) => {
        const selIdx = q.options.indexOf(sel);
        // ✅ Use translated option directly
        return sel;
      }).filter(a => {
        // ✅ Filter out "Others" in any language (last option)
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
    if (!this.trainingText || this.trainingText.trim() === '') {
      alert('Please enter training data');
      return;
    }
    axios.post('http://localhost:3000/api/ai/train', {
      userId: this.user.id,
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      trainingData: this.trainingText
    }).then(() => {
      this.isTrained = true;
      this.isEditing = false;
      Swal.fire({
        icon: 'success',
        title: 'AI Trained Successfully!',
        confirmButtonColor: '#DD1977'
      }).then(() => window.location.reload());
    }).catch(() => alert('❌ Training failed'));
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
          this.recognition.lang = 'en-IN';
          this.recognition.continuous = false;
          this.recognition.interimResults = false;

          this.recognition.onstart = () => {
            this.isListening = true;
            this.cdr.detectChanges();
          };

          this.recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            this.trainingText = this.trainingText
              ? this.trainingText + ' ' + transcript
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

  enableEdit() { this.isEditing = true; }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  Chat() { this.router.navigate(['/chat']); }
  Settings() { this.router.navigate(['/settings']); }
}