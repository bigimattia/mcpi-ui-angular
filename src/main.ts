import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import '@mcp-ui/client/ui-resource-renderer.wc.js';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
