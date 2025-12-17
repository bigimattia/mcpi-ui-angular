import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiRendererComponent } from './ui-renderer/ui-renderer';
import { WidgetResource } from './ui-renderer/mcp-resource.interface';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiRendererComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('mcpi-ui-angular');

  /**
   * Example: Single MCP resource from server
   */
  protected singleResource: WidgetResource = {
    uri: 'ui://example-single',
    mimeType: 'text/html',
    text: `
      <div style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px;">
        <h3>Single Server Widget</h3>
        <p>This is a single MCP-UI widget from the server.</p>
        <button onclick="
          this.dispatchEvent(
            new CustomEvent('ui-action', {
              detail: { intent: 'settings', message: 'Opened from single widget' },
              bubbles: true,
              composed: true
            })
          )
        ">
          Open Settings (Local Component)
        </button>
      </div>
    `,
  };

  /**
   * Example: Multiple widgets (array) - mix of server widgets and local components
   * This demonstrates the array structure which is recommended for multiple widgets
   */
  protected multipleResources: WidgetResource[] = [
    // First widget: Server-provided HTML widget
    {
      uri: 'ui://widget-1',
      mimeType: 'text/html',
      text: `
        <div style="padding: 1rem; background: #e3f2fd; border-radius: 4px;">
          <h3>Widget 1: Server Widget</h3>
          <p>This widget is rendered from server HTML.</p>
          <button onclick="
            this.dispatchEvent(
              new CustomEvent('ui-action', {
                detail: { intent: 'settings', source: 'widget-1' },
                bubbles: true,
                composed: true
              })
            )
          ">
            Trigger Local Component
          </button>
        </div>
      `,
    },
    // Second widget: Another server widget
    {
      uri: 'ui://widget-2',
      mimeType: 'text/html',
      text: `
        <div style="padding: 1rem; background: #f3e5f5; border-radius: 4px;">
          <h3>Widget 2: Another Server Widget</h3>
          <p>Multiple widgets can be rendered in sequence.</p>
        </div>
      `,
    },
    // Third widget: Local Angular component (rendered via intent)
    {
      intent: 'settings',
      data: {
        title: 'Settings Component',
        message: 'This is a local Angular component rendered via intent mapping',
      },
    },
  ];

  /**
   * Toggle between single and multiple widget examples
   */
  protected useMultiple = signal(true);
}
