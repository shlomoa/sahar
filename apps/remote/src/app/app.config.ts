import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter } from '@angular/router';
import { ContentService, initSharedIcons } from 'shared';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

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
    
    provideHttpClient(),
    MatIconRegistry,

    provideRouter(routes),

    provideAppInitializer(() => {
      const contentService = inject(ContentService);
      return contentService.fetchCatalog();
    }),
    provideAppInitializer(() => {
      // This runs inside an injection context, so initSaharIcons()
      // may safely call `inject(MatIconRegistry)` and `inject(DomSanitizer)`.
      initSharedIcons();
      // return void (sync) – boot continues immediately
    }),
  ]
};
