import { Component, Input, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-ui-renderer',
  template: `<ui-resource-renderer></ui-resource-renderer>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UiRendererComponent implements AfterViewInit {
  @Input() resource: any;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const renderer = this.el.nativeElement.querySelector('ui-resource-renderer');
    if (renderer) {
      // Set properties on the Web Component.
      // MCP-UI Web Component accepts props as strings or JSON strings.
      renderer.resource = this.resource;
      // Listen for actions
      renderer.addEventListener('onUIAction', (event: any) => {
        console.log('MCP UI Action:', event.detail);
        // Handle backend tool calls, intents, etc.
      });
    }
  }
}
