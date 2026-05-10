import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FireDoorsOverview } from './fire-doors-overview';

describe('FireDoorsOverview', () => {
  let component: FireDoorsOverview;
  let fixture: ComponentFixture<FireDoorsOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FireDoorsOverview],
    }).compileComponents();

    fixture = TestBed.createComponent(FireDoorsOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
