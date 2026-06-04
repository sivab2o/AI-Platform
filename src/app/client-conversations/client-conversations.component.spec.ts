import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientConversationsComponent } from './client-conversations.component';

describe('ClientConversationsComponent', () => {
  let component: ClientConversationsComponent;
  let fixture: ComponentFixture<ClientConversationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientConversationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClientConversationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
