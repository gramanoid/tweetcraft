import { TabComponent } from './TabManager';

export class WeeklyTab implements TabComponent {
  constructor() {}

  render(): string {
    return '<div>Weekly Tab</div>';
  }

  attachEventListeners(container: HTMLElement): void {}

  destroy(): void {}
}
