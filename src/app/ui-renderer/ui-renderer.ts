import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Type,
  ViewContainerRef,
  ComponentRef,
  ChangeDetectorRef,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from '../settings-component/settings-component';
import {
  WidgetResource,
  McpResource,
  LocalWidgetConfig,
  isMcpResource,
  isLocalWidget,
} from './mcp-resource.interface';

/**
 * UI Renderer Component
 * Renders MCP-UI widgets from server or local Angular components
 * Supports both single widget and multiple widgets (array)
 */
@Component({
  selector: 'app-ui-renderer',
  imports: [CommonModule],
  templateUrl: './ui-renderer.html',
  styleUrl: './ui-renderer.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UiRendererComponent implements OnInit, AfterViewInit, OnChanges {
  /**
   * Single resource or array of resources to render
   * Can be server-provided MCP resources or local component configs
   */
  @Input() resource: WidgetResource | WidgetResource[] | null = null;

  /**
   * ViewChildren for ui-resource-renderer elements (web components)
   */
  @ViewChildren('uiRenderer', { read: ElementRef })
  private uiRenderers!: QueryList<ElementRef<any>>;

  /**
   * Map of intent strings to Angular component types for local components
   */
  private readonly INTENT_COMPONENT_MAP: Record<string, Type<any>> = {
    settings: SettingsComponent,
    // Add more local component mappings here
    // 'open-asset-editor': AssetEditorComponent,
  };

  /**
   * ViewContainerRefs for local components (one per resource)
   */
  @ViewChildren('componentHost', { read: ViewContainerRef })
  private componentHosts!: QueryList<ViewContainerRef>;

  /**
   * Track rendered components for cleanup
   */
  private componentRefs: Map<number, ComponentRef<any>> = new Map();

  /**
   * Track rendering attempts to prevent infinite retries
   */
  private renderingAttempts: Map<number, number> = new Map();

  /**
   * Track server widget renderers for event cleanup
   */
  private serverRenderers: Map<number, HTMLElement> = new Map();

  /**
   * Track event handlers for proper cleanup
   */
  private eventHandlers: Map<number, (event: Event) => void> = new Map();

  /**
   * Normalized array of resources for rendering
   */
  protected resources: WidgetResource[] = [];

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Normalize resources immediately when component initializes
    this.resources = this.normalizeToArray(this.resource);
  }

  ngAfterViewInit() {
    // Render resources after view is initialized
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.renderResources();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resource']) {
      // Update resources array immediately
      this.resources = this.normalizeToArray(this.resource);
      
      if (!changes['resource'].firstChange) {
        this.cleanup();
        // Wait for view to update, then re-render
        setTimeout(() => {
          this.renderResources();
        });
      }
    }
  }

  /**
   * Normalize input to array and render all resources
   */
  private renderResources() {
    // Wait for ViewChildren to be available
    // Use multiple attempts to ensure ViewContainerRefs are ready
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryRender = () => {
      attempts++;
      
      // Render all resources
      this.resources.forEach((resource, index) => {
        if (isMcpResource(resource)) {
          this.renderServerWidget(resource, index);
        } else if (isLocalWidget(resource)) {
          // For local components, check if ViewContainerRefs are available
          const hosts = this.componentHosts?.toArray() || [];
          const localComponentCount = this.resources
            .slice(0, index)
            .filter((r) => isLocalWidget(r)).length;
          
          // Only render if we have enough ViewContainerRefs, or retry
          if (hosts.length >= localComponentCount + 1 || attempts >= maxAttempts) {
            this.renderLocalComponent(resource, index);
          }
        }
      });

      this.cdr.detectChanges();
    };

    // Initial attempt
    setTimeout(tryRender, 0);
    
    // Retry if ViewContainerRefs aren't ready yet
    if (this.componentHosts.length === 0) {
      setTimeout(tryRender, 50);
      setTimeout(tryRender, 100);
    }
  }

  /**
   * Normalize single resource or array to always be an array
   */
  private normalizeToArray(
    resource: WidgetResource | WidgetResource[] | null
  ): WidgetResource[] {
    if (!resource) {
      return [];
    }
    return Array.isArray(resource) ? resource : [resource];
  }

  /**
   * Render a server-provided MCP widget using ui-resource-renderer web component
   */
  private renderServerWidget(resource: McpResource, index: number) {
    // Find which ViewChildren index corresponds to this resource index
    // (only server widgets have ViewChildren entries)
    let viewChildrenIndex = -1;
    let serverWidgetCount = 0;
    for (let i = 0; i < index; i++) {
      if (isMcpResource(this.resources[i])) {
        serverWidgetCount++;
      }
    }
    viewChildrenIndex = serverWidgetCount;

    // Try using ViewChildren first (more reliable)
    let renderer: any = null;
    if (this.uiRenderers && this.uiRenderers.length > viewChildrenIndex) {
      const rendererRef = this.uiRenderers.toArray()[viewChildrenIndex];
      if (rendererRef && rendererRef.nativeElement) {
        renderer = rendererRef.nativeElement;
      }
    }

    // Fallback: Find via DOM query
    if (!renderer) {
      const container = this.el.nativeElement.querySelector(
        `.mcp-widget-container[data-widget-index="${index}"]`
      );

      if (container) {
        renderer = container.querySelector('ui-resource-renderer') as any;
      }
    }

    if (!renderer) {
      console.warn(`ui-resource-renderer not found for widget at index ${index}`);
      return;
    }

    // Set resource property (MCP-UI web component accepts object)
    renderer.resource = resource;

    // Remove old event listener if exists
    const oldRenderer = this.serverRenderers.get(index);
    const oldHandler = this.eventHandlers.get(index);
    if (oldRenderer && oldHandler) {
      oldRenderer.removeEventListener('ui-action', oldHandler);
    }

    // Listen for actions from the widget
    const actionHandler = (event: Event) => {
      this.handleWidgetAction(event as CustomEvent, resource);
    };
    // Listen in bubble phase (default) to catch events that bubble up from child elements
    renderer.addEventListener('ui-action', actionHandler);

    // Store renderer and handler for cleanup
    this.serverRenderers.set(index, renderer);
    this.eventHandlers.set(index, actionHandler);
  }

  /**
   * Render a local Angular component based on intent
   */
  private renderLocalComponent(config: LocalWidgetConfig, index: number) {
    const componentType = this.INTENT_COMPONENT_MAP[config.intent];

    if (!componentType) {
      console.warn(
        `Unknown intent: ${config.intent}. Available intents:`,
        Object.keys(this.INTENT_COMPONENT_MAP)
      );
      return;
    }

    // Find the container for this component
    const container = this.el.nativeElement.querySelector(
      `.local-component-container[data-component-index="${index}"]`
    );

    if (!container) {
      const attempts = this.renderingAttempts.get(index) || 0;
      if (attempts < 3) {
        this.renderingAttempts.set(index, attempts + 1);
        // Retry after a short delay if container not found yet
        setTimeout(() => {
          this.renderLocalComponent(config, index);
        }, 50);
      } else {
        console.warn(`Container not found for component at index ${index} after ${attempts} attempts`);
      }
      return;
    }

    // Get all ViewContainerRefs and find the one that matches this container
    const hosts = this.componentHosts.toArray();
    let host: ViewContainerRef | undefined;

    // Count how many local components come before this index
    let localComponentIndex = 0;
    for (let i = 0; i < index; i++) {
      if (isLocalWidget(this.resources[i])) {
        localComponentIndex++;
      }
    }

    // Use index-based matching (most reliable when we know the order)
    if (localComponentIndex < hosts.length) {
      host = hosts[localComponentIndex];
    }

    // Fallback: Match ViewContainerRef by finding the one inside our container
    if (!host) {
      for (const h of hosts) {
        const hostElement = h.element.nativeElement;
        if (container.contains(hostElement) || container === hostElement.parentElement) {
          host = h;
          break;
        }
      }
    }

    if (!host) {
      const attempts = this.renderingAttempts.get(index) || 0;
      if (attempts < 3) {
        this.renderingAttempts.set(index, attempts + 1);
        // Retry after a short delay if ViewContainerRef not found yet
        setTimeout(() => {
          this.renderLocalComponent(config, index);
        }, 50);
      } else {
        console.warn(
          `ViewContainerRef not found for component at index ${index} after ${attempts} attempts. ` +
          `Total hosts: ${hosts.length}, Local component index: ${localComponentIndex}`
        );
      }
      return;
    }

    // Reset attempts counter on success
    this.renderingAttempts.delete(index);

    // Clean up existing component at this index if any
    const existingRef = this.componentRefs.get(index);
    if (existingRef) {
      try {
        existingRef.destroy();
      } catch (error) {
        // Component may already be destroyed
        console.debug('Component already destroyed or error destroying:', error);
      }
    }

    // Create the component
    try {
      const componentRef = host.createComponent(componentType);

      // Pass data to component instance
      if (config.data) {
        // Assign all properties from data object to component instance
        Object.keys(config.data).forEach((key) => {
          (componentRef.instance as any)[key] = config.data![key];
        });
      }
      
      // Trigger change detection for the component
      componentRef.changeDetectorRef.detectChanges();

      // Store reference for cleanup
      this.componentRefs.set(index, componentRef);
    } catch (error) {
      console.error(`Error creating component for intent ${config.intent}:`, error);
    }
  }

  /**
   * Handle actions from widgets (both server and local)
   */
  private handleWidgetAction(event: CustomEvent, resource: WidgetResource) {
    const actionDetail = event.detail;
    console.log('MCP UI Action:', actionDetail, 'from resource:', resource);

    // Extract intent and payload
    const { intent, ...payload } = actionDetail;

    if (intent) {
      // Check if this intent maps to a local component
      if (this.INTENT_COMPONENT_MAP[intent]) {
        this.handleIntent(intent, payload);
      } else {
        // Handle other actions (tool calls, navigation, etc.)
        this.handleOtherAction(actionDetail);
      }
    } else {
      this.handleOtherAction(actionDetail);
    }
  }

  /**
   * Handle intent-based navigation to local components
   */
  private handleIntent(intent: string, payload: any) {
    const componentType = this.INTENT_COMPONENT_MAP[intent];
    if (!componentType) {
      console.warn('Unknown intent:', intent);
      return;
    }

    // Create a new local widget config and add it to resources
    const newWidget: LocalWidgetConfig = {
      intent,
      data: payload,
    };

    // Add to resources array and re-render
    this.resources = [...this.resources, newWidget];
    this.cdr.detectChanges();

    // Wait for view to update, then render the new component
    setTimeout(() => {
      this.renderLocalComponent(newWidget, this.resources.length - 1);
      this.cdr.detectChanges();
    });
  }

  /**
   * Handle other types of actions (tool calls, etc.)
   */
  private handleOtherAction(action: any) {
    // Emit custom event or handle via service
    // This can be extended to handle backend tool calls, navigation, etc.
    console.log('Handling other action:', action);
  }

  /**
   * Cleanup all rendered components and widgets
   */
  private cleanup() {
    // Cleanup Angular components
    this.componentRefs.forEach((ref) => {
      if (ref) {
        try {
          ref.destroy();
        } catch (error) {
          // Component may already be destroyed
          console.debug('Error destroying component:', error);
        }
      }
    });
    this.componentRefs.clear();
    this.renderingAttempts.clear();

    // Cleanup server renderers and their event handlers
    this.serverRenderers.forEach((renderer, index) => {
      const handler = this.eventHandlers.get(index);
      if (renderer && handler) {
        renderer.removeEventListener('ui-action', handler);
      }
    });
    this.serverRenderers.clear();
    this.eventHandlers.clear();
  }

  /**
   * Track by function for *ngFor optimization
   */
  protected trackByIndex(index: number): number {
    return index;
  }

  /**
   * Check if a resource is a server widget
   */
  protected isServerWidget(resource: WidgetResource): boolean {
    return isMcpResource(resource);
  }

  /**
   * Check if a resource is a local component
   */
  protected isLocalComponent(resource: WidgetResource): boolean {
    return isLocalWidget(resource);
  }
}
