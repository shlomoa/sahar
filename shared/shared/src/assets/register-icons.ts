import { inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export function initSharedIcons(): void {
  const reg = inject(MatIconRegistry);
  const san = inject(DomSanitizer);

  const add = (name: string) =>
    reg.addSvgIcon(
      name,
      san.bypassSecurityTrustResourceUrl(`assets/icons/${name}.svg`)
    );

  [
    'narrate','no_narration'
  ].forEach(add);
}
