/**
 * CustomTab Component
 * Allows users to create custom reply templates with personalized settings
 */

import { TabComponent } from './TabManager';

export class CustomTab implements TabComponent {
  private onSelectCallback: (config: any) => void;
  private customSettings = {
    style: '',
    tone: '',
    length: ''
  };

  constructor(onSelectCallback: (config: any) => void) {
    this.onSelectCallback = onSelectCallback;
    this.loadCustomSettings();
  }

  public render(): string {
    return this.getHTML();
  }

  public cleanup(): void {
    // Cleanup will be handled by the TabManager
  }

  public destroy(): void {
    // Clean up any resources
    this.customSettings = { style: '', tone: '', length: '' };
  }

  public attachEventListeners(container: HTMLElement): void {
    // Style input
    const styleInput = container.querySelector('#custom-style') as HTMLTextAreaElement;
    if (styleInput) {
      styleInput.addEventListener('input', (e: Event) => {
        this.customSettings.style = (e.target as HTMLTextAreaElement).value;
      });
    }

    // Tone input
    const toneInput = container.querySelector('#custom-tone') as HTMLTextAreaElement;
    if (toneInput) {
      toneInput.addEventListener('input', (e: Event) => {
        this.customSettings.tone = (e.target as HTMLTextAreaElement).value;
      });
    }

    // Length select
    const lengthSelect = container.querySelector('#custom-length') as HTMLSelectElement;
    if (lengthSelect) {
      lengthSelect.addEventListener('change', (e: Event) => {
        this.customSettings.length = (e.target as HTMLSelectElement).value;
      });
    }

    // Save button
    const saveBtn = container.querySelector('.custom-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveCustomSettings();
        this.showNotification(container, 'Settings saved!');
      });
    }

    // Generate button
    const generateBtn = container.querySelector('.custom-generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.onSelectCallback({
          tab: 'custom',
          customConfig: this.customSettings
        });
      });
    }

    // Preset buttons
    container.querySelectorAll('.preset-btn').forEach((btn: Element) => {
      btn.addEventListener('click', (e: Event) => {
        const preset = (e.target as HTMLElement).dataset.preset;
        this.applyPreset(preset || 'professional');
        // Re-render with new preset
        container.innerHTML = this.render();
        this.attachEventListeners(container);
      });
    });
  }

  private loadCustomSettings(): void {
    const stored = localStorage.getItem('tweetcraft_custom_settings');
    if (stored) {
      try {
        this.customSettings = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load custom settings:', e);
      }
    }
  }

  private saveCustomSettings(): void {
    localStorage.setItem('tweetcraft_custom_settings', JSON.stringify(this.customSettings));
  }

  private getHTML(): string {
    return `
      <div class="custom-tab-container">
        <div class="custom-header">
          <h3>Create Your Custom Template</h3>
          <p class="custom-subtitle">Define your own style, tone, and length</p>
        </div>

        <div class="custom-form">
          <div class="form-group">
            <label for="custom-style">Writing Style</label>
            <textarea 
              id="custom-style" 
              class="custom-input"
              placeholder="e.g., Professional but approachable, with a hint of humor..."
              rows="3">${this.customSettings.style || ''}</textarea>
            <span class="input-hint">Describe how you want to sound</span>
          </div>

          <div class="form-group">
            <label for="custom-tone">Tone & Voice</label>
            <textarea 
              id="custom-tone"
              class="custom-input"
              placeholder="e.g., Confident, empathetic, slightly formal..."
              rows="3">${this.customSettings.tone || ''}</textarea>
            <span class="input-hint">Define your emotional tone</span>
          </div>

          <div class="form-group">
            <label for="custom-length">Length Preference</label>
            <select id="custom-length" class="custom-select">
              <option value="concise" ${this.customSettings.length === 'concise' ? 'selected' : ''}>
                Concise (1-2 sentences)
              </option>
              <option value="moderate" ${this.customSettings.length === 'moderate' ? 'selected' : ''}>
                Moderate (2-3 sentences)
              </option>
              <option value="detailed" ${this.customSettings.length === 'detailed' ? 'selected' : ''}>
                Detailed (3-4 sentences)
              </option>
              <option value="comprehensive" ${this.customSettings.length === 'comprehensive' ? 'selected' : ''}>
                Comprehensive (4+ sentences)
              </option>
            </select>
          </div>

          <div class="custom-actions">
            <button class="custom-save-btn">Save Settings</button>
            <button class="custom-generate-btn">Generate Reply</button>
          </div>

          <div class="custom-presets">
            <h4>Quick Presets</h4>
            <div class="preset-buttons">
              <button class="preset-btn" data-preset="professional">Professional</button>
              <button class="preset-btn" data-preset="casual">Casual</button>
              <button class="preset-btn" data-preset="creative">Creative</button>
              <button class="preset-btn" data-preset="analytical">Analytical</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private applyPreset(preset: string): void {
    const presets: Record<string, any> = {
      professional: {
        style: 'Clear, concise, and professional. Use industry-appropriate language.',
        tone: 'Confident and authoritative, yet approachable',
        length: 'moderate'
      },
      casual: {
        style: 'Relaxed and conversational. Use everyday language.',
        tone: 'Friendly and warm, like talking to a friend',
        length: 'concise'
      },
      creative: {
        style: 'Imaginative and unique. Use metaphors and creative expressions.',
        tone: 'Playful and engaging, with personality',
        length: 'detailed'
      },
      analytical: {
        style: 'Logical and data-driven. Focus on facts and evidence.',
        tone: 'Objective and thoughtful, with clear reasoning',
        length: 'comprehensive'
      }
    };

    if (presets[preset]) {
      this.customSettings = presets[preset];
      this.saveCustomSettings();
    }
  }

  private showNotification(container: HTMLElement, message: string): void {
    // Simple notification - could be enhanced with better UI
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
}
