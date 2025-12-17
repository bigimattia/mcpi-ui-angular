import { Component, Input } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-settings-component',
  imports: [JsonPipe],
  templateUrl: './settings-component.html',
  styleUrl: './settings-component.css',
})
export class SettingsComponent {
  @Input() title?: string;
  @Input() message?: string;
  @Input() data?: Record<string, any>;
}
