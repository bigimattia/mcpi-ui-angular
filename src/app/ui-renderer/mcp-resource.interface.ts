/**
 * MCP-UI Resource interface
 * Represents a widget resource that can be rendered either from server or as a local component
 */
export interface McpResource {
  /** Resource URI identifier */
  uri: string;
  /** MIME type of the resource content */
  mimeType: string;
  /** Resource content (HTML, JSON, etc.) */
  text?: string;
  /** Optional blob data for binary resources */
  blob?: Blob;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Widget configuration for local Angular components
 */
export interface LocalWidgetConfig {
  /** Intent identifier to map to a local component */
  intent: string;
  /** Component-specific data/payload */
  data?: Record<string, any>;
}

/**
 * Union type: Resource can be from server (McpResource) or local component (LocalWidgetConfig)
 */
export type WidgetResource = McpResource | LocalWidgetConfig;

/**
 * Type guard to check if resource is a server-provided MCP resource
 */
export function isMcpResource(resource: WidgetResource): resource is McpResource {
  return 'uri' in resource && 'mimeType' in resource;
}

/**
 * Type guard to check if resource is a local component config
 */
export function isLocalWidget(resource: WidgetResource): resource is LocalWidgetConfig {
  return 'intent' in resource && !('uri' in resource);
}

