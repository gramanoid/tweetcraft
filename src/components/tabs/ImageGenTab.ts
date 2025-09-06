/**
 * ImageGenTab Component
 * Handles AI-powered image generation for tweets
 */

import { TabComponent } from './TabManager';

export class ImageGenTab implements TabComponent {
  private onSelectCallback: (config: any) => void;
  private imagePrompt: string = '';
  private imageStyle: string = 'realistic';

  constructor(onSelectCallback: (config: any) => void) {
    this.onSelectCallback = onSelectCallback;
    this.loadSettings();
  }

  public render(): string {
    return this.getHTML();
  }

  public cleanup(): void {
    // Cleanup will be handled by the TabManager
  }

  public destroy(): void {
    // Clean up any resources
    this.imagePrompt = '';
    this.imageStyle = 'realistic';
  }

  public attachEventListeners(container: HTMLElement): void {
    // Prompt input
    const promptInput = container.querySelector('#image-prompt') as HTMLTextAreaElement;
    if (promptInput) {
      promptInput.addEventListener('input', (e: Event) => {
        this.imagePrompt = (e.target as HTMLTextAreaElement).value;
      });
    }

    // Style selector
    const styleSelect = container.querySelector('#image-style') as HTMLSelectElement;
    if (styleSelect) {
      styleSelect.addEventListener('change', (e: Event) => {
        this.imageStyle = (e.target as HTMLSelectElement).value;
        this.saveSettings();
      });
    }

    // Generate button
    const generateBtn = container.querySelector('.generate-image-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (this.imagePrompt.trim()) {
          this.onSelectCallback({
            tab: 'image-gen',
            imageConfig: {
              prompt: this.imagePrompt,
              style: this.imageStyle
            }
          });
        }
      });
    }

    // Style preset buttons
    container.querySelectorAll('.style-preset-btn').forEach((btn: Element) => {
      btn.addEventListener('click', (e: Event) => {
        const style = (e.target as HTMLElement).dataset.style;
        if (style) {
          this.imageStyle = style;
          container.innerHTML = this.render();
          this.attachEventListeners(container);
        }
      });
    });
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('tweetcraft_image_settings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.imageStyle = settings.style || 'realistic';
      } catch (e) {
        console.error('Failed to load image settings:', e);
      }
    }
  }

  private saveSettings(): void {
    localStorage.setItem('tweetcraft_image_settings', JSON.stringify({
      style: this.imageStyle
    }));
  }

  private getHTML(): string {
    return `
      <div class="image-gen-container">
        <div class="image-gen-header">
          <h3>AI Image Generation</h3>
          <p class="image-gen-subtitle">Create stunning images for your tweets</p>
        </div>

        <div class="image-gen-form">
          <div class="form-group">
            <label for="image-prompt">Image Description</label>
            <textarea 
              id="image-prompt" 
              class="image-prompt-input"
              placeholder="Describe the image you want to generate..."
              rows="4">${this.imagePrompt}</textarea>
            <span class="input-hint">Be specific about style, colors, and composition</span>
          </div>

          <div class="form-group">
            <label for="image-style">Art Style</label>
            <select id="image-style" class="image-style-select">
              <option value="realistic" ${this.imageStyle === 'realistic' ? 'selected' : ''}>
                Realistic Photo
              </option>
              <option value="digital-art" ${this.imageStyle === 'digital-art' ? 'selected' : ''}>
                Digital Art
              </option>
              <option value="anime" ${this.imageStyle === 'anime' ? 'selected' : ''}>
                Anime/Manga
              </option>
              <option value="oil-painting" ${this.imageStyle === 'oil-painting' ? 'selected' : ''}>
                Oil Painting
              </option>
              <option value="watercolor" ${this.imageStyle === 'watercolor' ? 'selected' : ''}>
                Watercolor
              </option>
              <option value="sketch" ${this.imageStyle === 'sketch' ? 'selected' : ''}>
                Pencil Sketch
              </option>
              <option value="3d-render" ${this.imageStyle === '3d-render' ? 'selected' : ''}>
                3D Render
              </option>
              <option value="cartoon" ${this.imageStyle === 'cartoon' ? 'selected' : ''}>
                Cartoon
              </option>
            </select>
          </div>

          <div class="style-presets">
            <h4>Quick Styles</h4>
            <div class="style-preset-grid">
              <button class="style-preset-btn" data-style="realistic">
                <span class="preset-icon">📷</span>
                <span>Photo</span>
              </button>
              <button class="style-preset-btn" data-style="digital-art">
                <span class="preset-icon">🎨</span>
                <span>Digital</span>
              </button>
              <button class="style-preset-btn" data-style="anime">
                <span class="preset-icon">✨</span>
                <span>Anime</span>
              </button>
              <button class="style-preset-btn" data-style="3d-render">
                <span class="preset-icon">🎮</span>
                <span>3D</span>
              </button>
            </div>
          </div>

          <button class="generate-image-btn">
            <span class="btn-icon">🎨</span>
            Generate Image
          </button>

          <div class="image-tips">
            <h4>Pro Tips</h4>
            <ul>
              <li>Include specific details about lighting and mood</li>
              <li>Mention camera angles for photos (e.g., "aerial view")</li>
              <li>Add artistic references (e.g., "in the style of Van Gogh")</li>
              <li>Specify aspect ratios if needed (e.g., "16:9 widescreen")</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}
