import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiRenderer } from './ui-renderer';

describe('UiRenderer', () => {
  let component: UiRenderer;
  let fixture: ComponentFixture<UiRenderer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiRenderer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UiRenderer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
