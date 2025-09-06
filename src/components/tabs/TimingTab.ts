import { TabComponent } from './TabManager';

export class TimingTab implements TabComponent {
  constructor() {}

  render(): string {
    return '<div>Timing Tab</div>';
  }

  attachEventListeners(container: HTMLElement): void {}

  destroy(): void {}
}
