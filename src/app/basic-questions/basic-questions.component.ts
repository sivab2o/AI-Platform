import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-basic-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './basic-questions.component.html',
  styleUrls: ['./basic-questions.component.css']
})
export class BasicQuestionsComponent implements OnInit {

  user: any;
  questions: any[] = [];
  isLoading: boolean = true;
  showForm: boolean = false;
  isEditing: boolean = false;
  editId: number | null = null;

  // ✅ Form fields
  formQuestion: string = '';
  formType: string = 'multiple';
  formHasOthers: boolean = true;
  formOptions: string[] = ['', '', ''];
  formSortOrder: number = 0;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.loadQuestions();
      }
    }
  }

  loadQuestions() {
    this.isLoading = true;
    axios.get(`http://localhost:3000/api/ai/questions/${this.user.user_id}`)
      .then(res => {
        this.questions = res.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error(err);
        this.isLoading = false;
      });
  }

  openAddForm() {
    this.isEditing = false;
    this.editId = null;
    this.formQuestion = '';
    this.formType = 'multiple';
    this.formHasOthers = true;
    this.formOptions = ['', '', ''];
    this.formSortOrder = this.questions.length + 1;
    this.showForm = true;
  }

  openEditForm(q: any) {
    this.isEditing = true;
    this.editId = q.id;
    this.formQuestion = q.question;
    this.formType = q.question_type;
    this.formHasOthers = q.has_others;
    this.formOptions = q.options.length > 0 ? [...q.options] : ['', '', ''];
    this.formSortOrder = q.sort_order;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  addOption() {
    this.formOptions.push('');
  }

  removeOption(index: number) {
    if (this.formOptions.length > 2) {
      this.formOptions.splice(index, 1);
    }
  }

  trackByIndex(index: number) {
    return index;
  }

  saveQuestion() {
    if (!this.formQuestion.trim()) {
      alert('Question is required!');
      return;
    }

    if (this.formType === 'multiple') {
      const validOptions = this.formOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) {
        alert('Add at least 2 options!');
        return;
      }
    }

    const data = {
      ownerId: this.user.user_id,
      question: this.formQuestion,
      questionType: this.formType,
      options: this.formType === 'multiple' ? this.formOptions.filter(o => o.trim() !== '') : [],
      hasOthers: this.formHasOthers,
      sortOrder: this.formSortOrder
    };

    if (this.isEditing && this.editId) {
      axios.put(`http://localhost:3000/api/ai/questions/${this.editId}`, data)
        .then(() => {
          this.showForm = false;
          this.loadQuestions();
          Swal.fire({ icon: 'success', title: 'Question Updated!', timer: 1000, showConfirmButton: false, confirmButtonColor: '#DD1977' });
        })
        .catch(() => alert('❌ Failed to update'));
    } else {
      axios.post('http://localhost:3000/api/ai/questions', data)
        .then(() => {
          this.showForm = false;
          this.loadQuestions();
          Swal.fire({ icon: 'success', title: 'Question Added!', timer: 1000, showConfirmButton: false, confirmButtonColor: '#DD1977' });
        })
        .catch(() => alert('❌ Failed to save'));
    }
  }

  deleteQuestion(id: number) {
    Swal.fire({
      title: 'Delete this question?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD1977',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, delete!'
    }).then(result => {
      if (result.isConfirmed) {
        axios.delete(`http://localhost:3000/api/ai/questions/${id}`)
          .then(() => {
            this.loadQuestions();
            Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1000, showConfirmButton: false, confirmButtonColor: '#DD1977' });
          })
          .catch(() => alert('❌ Failed to delete'));
      }
    });
  }

  Dashboard() { this.router.navigate(['/dashboard']); }
  Clients() { this.router.navigate(['/clients']); }
  Settings() { this.router.navigate(['/settings']); }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}