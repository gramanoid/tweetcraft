import { TabComponent } from './TabManager';

export class ABTestTab implements TabComponent {
  constructor() {}

  render(): string {
    return '<div>A/B Test Tab</div>';
  }

  attachEventListeners(container: HTMLElement): void {}

  destroy(): void {}
}
