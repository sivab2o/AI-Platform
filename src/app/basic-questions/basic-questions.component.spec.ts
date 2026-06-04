import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicQuestionsComponent } from './basic-questions.component';

describe('BasicQuestionsComponent', () => {
  let component: BasicQuestionsComponent;
  let fixture: ComponentFixture<BasicQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicQuestionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BasicQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
