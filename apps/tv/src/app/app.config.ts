import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { ContentService, initSharedIcons } from 'shared';

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
    MatIconRegistry,
    provideHttpClient(),    
    provideRouter(routes),
    provideAnimations(),
    provideAppInitializer(() => {
      const contentService = inject(ContentService);
      return contentService.fetchCatalog();
    }),
    provideAppInitializer(() => {
      // This runs inside an injection context, so initSaharIcons()
      // may safely call `inject(MatIconRegistry)` and `inject(DomSanitizer)`.
      initSharedIcons();
      // return void (sync) – boot continues immediately
    })
  ]
};
