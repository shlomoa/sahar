import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ContentService } from 'shared';

import { routes } from './app.routes';

/**
 * Initialize catalog before app bootstrap
 * This guarantees catalog data is available when:
 * - WebSocket connection starts
 * - Components render
 * - State synchronization begins
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(() => {
      const contentService = inject(ContentService);
      return contentService.fetchCatalog();
    })
  ]
};
