import { TabComponent } from './TabManager';

export class EngagementTab implements TabComponent {
  constructor() {}

  render(): string {
    return '<div>Engagement Tab</div>';
  }

  attachEventListeners(container: HTMLElement): void {}

  destroy(): void {}
}
