import { TabComponent } from './TabManager';

export class CacheTab implements TabComponent {
  constructor() {}

  render(): string {
    return '<div>Cache Tab</div>';
  }

  attachEventListeners(container: HTMLElement): void {}

  destroy(): void {}
}
