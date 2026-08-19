import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  allTexts: string[] = [
    'Welcome back 👋',
    'Total Conversations',
    'Leads Generated',
    'Hot Leads',
    'AI Accuracy',
    'Dashboard',
    'Chat',
    'Settings',
    'Logout',
    '🧠 Basic Training for Your AI Employee',
    '✏️ Edit AI Training',
    '🧠 Train Your AI Employee',
    'Choose the correct answers — you can select multiple options per question',
    'Question',
    'of',
    '← Previous',
    'Next →',
    '✅ Finish & Review',
    '← Redo Questions',
    'Describe your business, services, pricing...',
    '🎤 Speak',
    '🛑 Stop Listening',
    '🔴 Listening... speak now, click Stop when done',
    'Save & Train AI',
    'Update AI',
    '✏ Edit',
    'Please specify...',
    'What type of business do you run?',
    'What are your main services or products?',
    'Who are your target customers?',
    'What is your pricing model?',
    'What is your approximate price range?',
    'What are your working hours?',
    'Where is your business located or which regions do you serve?',
    'How can customers contact you?',
    'What makes your business stand out from competitors?',
    'How does your onboarding process work for new customers?',
    'Do you have any current offers or promotions?',
    'In which languages should the AI respond to customers?',
    'What tone should the AI use when talking to customers?',
    'What should the AI NOT say or promise to customers?',
    'What are the most common questions your customers ask?',
    'IT / Software', 'Retail / E-commerce', 'Healthcare', 'Education', 'Real Estate',
    'Finance / Accounting', 'Marketing / Agency', 'Manufacturing', 'Restaurant / Food', 'Others',
    'Website Development', 'Mobile App Development', 'Digital Marketing / SEO', 'Product Sales',
    'Consulting / Advisory', 'Training / Courses', 'Support / Maintenance', 'Design Services',
    'Cloud / Hosting',
    'Small Businesses', 'Large Enterprises', 'Individual Consumers', 'Students', 'Startups',
    'Government / NGO', 'Freelancers', 'Healthcare Professionals',
    'Fixed Project Price', 'Monthly Subscription', 'Hourly Rate', 'Freemium (Free + Paid)',
    'Commission Based', 'Pay Per Use', 'Custom Quotation',
    'Under ₹5,000', '₹5,000 – ₹20,000', '₹20,000 – ₹50,000', '₹50,000 – ₹1,00,000',
    'Above ₹1,00,000', 'Varies by Project', 'Free / Open Source',
    '9 AM – 6 PM (Mon–Fri)', '9 AM – 6 PM (Mon–Sat)', '9 AM – 6 PM (Mon–Sun)',
    '24/7 Support Available', 'Flexible / By Appointment', 'Morning Only', 'Evening Only',
    'Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Pan India', 'South India Only',
    'International Clients', 'Online / Remote Only',
    'WhatsApp', 'Phone Call', 'Email', 'Website Contact Form',
    'Social Media (Instagram / Facebook)', 'Walk-in / Office Visit', 'Video Call (Zoom / Meet)',
    'Years of Experience (5+ years)', 'Large Client Base (200+ clients)', '24/7 Customer Support',
    'Free Consultation', 'Fast Delivery', 'Affordable Pricing', 'Certified / Award Winning',
    'Custom Solutions',
    'Free Consultation → Proposal → Payment → Delivery', 'Direct Purchase Online',
    'Demo / Trial First', 'Site Visit → Quote → Work Begins', 'Registration → Account → Usage',
    '10% Off First Order', '20% Off First Project', 'Free Logo with Website',
    'Free 1-Month Support', 'Referral Discount', 'Seasonal Sale Running', 'No Current Offers',
    'English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada',
    'Friendly & Casual', 'Professional & Formal', 'Energetic & Enthusiastic',
    'Calm & Supportive', 'Short & Direct',
    'Do not promise delivery under 7 days', 'Do not discuss competitor pricing',
    'Do not offer discounts without approval', 'Do not share internal pricing',
    'Do not make refund commitments', 'No restrictions',
    'Do you offer refunds?', 'How long does delivery take?',
    'Do you provide after-sales support?', 'Can I see a demo first?',
    'Do you have a physical office?', 'Are you available on weekends?'
  ];

  getCurrentLang(): string {
    return localStorage.getItem('lang') || 'en';
  }

  private getKey(lang: string, index: number): string {
    return `tr_${lang}_${index}`;
  }

  async translateAndCache(lang: string): Promise<void> {
    const res = await axios.post('http://localhost:3000/api/ai/translate', {
      texts: this.allTexts,
      targetLang: lang
    });

    const translated: string[] = res.data.translations;

    this.allTexts.forEach((text, i) => {
      localStorage.setItem(this.getKey(lang, i), translated[i]);
    });

  }

  get(text: string, lang: string): string {
    if (lang === 'en') return text;
    const index = this.allTexts.indexOf(text);
    if (index === -1) return text;
    return localStorage.getItem(this.getKey(lang, index)) || text;
  }

  // ✅ Updated — calls API if not cached, saves to localStorage
  async translate(texts: string[], lang: string): Promise<string[]> {
    if (lang === 'en') return texts;

    // ✅ Check cache first using key-value map
    const cacheKey = `tr_map_${lang}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const cachedMap = JSON.parse(cached);
      const result = texts.map(t => cachedMap[t] || t);
      return result;
    }

    // ✅ Not cached — call API
    const res = await axios.post('http://localhost:3000/api/ai/translate', {
      texts,
      targetLang: lang
    });

    const translated: string[] = res.data.translations;

    // ✅ Save as key-value map
    const cacheMap: any = {};
    texts.forEach((t, i) => {
      cacheMap[t] = translated[i];
    });
    localStorage.setItem(cacheKey, JSON.stringify(cacheMap));

    return translated;
  }
}