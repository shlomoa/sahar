import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDescriptionService } from '../../services/button-description.service';

@Component({
  selector: 'lib-button-description-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="description-panel"
      [class.visible]="!!description()"
      [attr.aria-hidden]="description() ? 'false' : 'true'"
      role="status"
      aria-live="polite"
    >
      <span>{{ description() || '' }}</span>
    </div>
  `,
  styleUrl: './button-description-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonDescriptionPanelComponent {
  private descriptionService = inject(ButtonDescriptionService);

  // Read from service signal (POC converts Observable to signal)
  readonly description = this.descriptionService.description;
}
