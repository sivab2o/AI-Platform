import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

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
  recognition: any;

  // Flow control
  showQuestionnaire: boolean = false;
  showTrainBox: boolean = false;

  // Questionnaire
  currentQuestionIndex: number = 0;

  questions: TrainingQuestion[] = [
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
    {
      question: 'Who are your target customers?',
      options: ['Small Businesses', 'Large Enterprises', 'Individual Consumers', 'Students', 'Startups', 'Government / NGO', 'Freelancers', 'Healthcare Professionals', 'Others'],
      selectedOptions: [], othersText: ''
    },
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

  constructor(private router: Router, private cdr: ChangeDetectorRef) { }

  get currentQuestion(): TrainingQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        console.log('USER DATA:', this.user);
        this.loadTrainingData();
      }
    } else {
      console.log('Running on server, skipping localStorage');
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
      .catch(err => {
        console.error('Error loading training data', err);
      });
  }

  // ── Questionnaire helpers ──────────────────────────

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
      if (opt === 'Others') {
        this.currentQuestion.othersText = '';
      }
    }
  }

  hasAnswer(): boolean {
    const q = this.currentQuestion;
    if (q.selectedOptions.length === 0) return false;
    if (q.selectedOptions.includes('Others') && !q.othersText.trim()) return false;
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
    this.questions.forEach(q => {
      if (q.selectedOptions.length === 0) return;
      let answers = q.selectedOptions.filter(o => o !== 'Others');
      if (q.selectedOptions.includes('Others') && q.othersText.trim()) {
        answers.push(q.othersText.trim());
      }
      if (answers.length > 0) {
        parts.push(`${q.question}\nAnswer: ${answers.join(', ')}`);
      }
    });
    this.trainingText = parts.join('\n\n');
  }

  redoQuestionnaire() {
    this.showTrainBox = false;
    this.showQuestionnaire = true;
    this.currentQuestionIndex = 0;
  }

  // ── Existing methods ──────────────────────────────

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
    })
      .then(() => {
        this.isTrained = true;
        this.isEditing = false;
        Swal.fire({
          icon: 'success',
          title: 'AI Trained Successfully!',
          confirmButtonColor: '#DD1977'
        }).then(() => {
          window.location.reload();
        });
      })
      .catch(() => {
        alert('❌ Training failed');
      });
  }

  // ── Voice ─────────────────────────────────────────

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

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-IN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.cdr.detectChanges(); // ✅ Force button to update immediately
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        this.trainingText = this.trainingText
          ? this.trainingText + ' ' + transcript
          : transcript;
        this.cdr.detectChanges(); // ✅ Force textarea update

        // Auto restart to keep listening
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) { }
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        this.cdr.detectChanges(); // ✅ Force button back to Speak

        if (event.error === 'not-allowed') {
          Swal.fire({
            icon: 'warning',
            title: 'Microphone Blocked',
            text: 'Please allow microphone access and try again.',
            confirmButtonColor: '#DD1977'
          });
        } else if (event.error === 'audio-capture') {
          Swal.fire({
            icon: 'error',
            title: 'No Microphone Found',
            text: 'Please connect a microphone and try again.',
            confirmButtonColor: '#DD1977'
          });
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Still listening → restart
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            this.cdr.detectChanges();
          }
        } else {
          // Stopped by user → update button
          this.cdr.detectChanges();
        }
      };

      this.recognition.start();

    } catch (err) {
      console.error('Speech init error:', err);
      this.isListening = false;
      this.cdr.detectChanges();
    }
  }

  stopListening() {
    this.isListening = false;       // ✅ Set false FIRST so onend doesn't restart
    this.cdr.detectChanges();       // ✅ Button updates to 🎤 Speak immediately
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
}