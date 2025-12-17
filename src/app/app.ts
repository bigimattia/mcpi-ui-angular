import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiRendererComponent } from './ui-renderer/ui-renderer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiRendererComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('mcpi-ui-angular');

  protected mcpResource = {
    uri: 'ui://example',
    mimeType: 'text/html',
    text: '<h2>Hello, Angular MCP-UI!</h2>',
  };
}
