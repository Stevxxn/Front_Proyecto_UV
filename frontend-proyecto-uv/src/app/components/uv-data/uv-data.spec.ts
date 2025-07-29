import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UvDataComponent } from './uv-data';

describe('UvDataComponent', () => {
  let component: UvDataComponent;
  let fixture: ComponentFixture<UvDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UvDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UvDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
