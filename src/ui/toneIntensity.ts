/**
 * Tone Intensity Slider Component for TweetCraft
 * Adjustable intensity for tone application
 */

import { Tone } from '@/config/templatesAndTones';
import { visualFeedback } from './visualFeedback';

interface IntensityLevel {
  value: number;
  label: string;
  temperature: number;
  description: string;
}

interface IntensityChangeEvent {
  toneId: string;
  intensity: number;
  temperature: number;
  label: string;
}

export class ToneIntensitySlider {
  private container: HTMLElement | null = null;
  private currentTone: Tone | null = null;
  private currentIntensity: number = 0.5;
  private onChangeCallback: ((event: IntensityChangeEvent) => void) | null = null;
  
  private readonly intensityLevels: IntensityLevel[] = [
    {
      value: 0,
      label: 'Subtle',
      temperature: 0.3,
      description: 'Barely noticeable, very mild'
    },
    {
      value: 0.25,
      label: 'Light',
      temperature: 0.5,
      description: 'Gentle touch of the tone'
    },
    {
      value: 0.5,
      label: 'Balanced',
      temperature: 0.7,
      description: 'Natural, well-balanced'
    },
    {
      value: 0.75,
      label: 'Strong',
      temperature: 0.85,
      description: 'Pronounced and clear'
    },
    {
      value: 1,
      label: 'Maximum',
      temperature: 1.0,
      description: 'Full intensity, unrestrained'
    }
  ];

  constructor() {
    console.log('%c🎚️ ToneIntensitySlider initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Create the intensity slider component
   */
  create(tone: Tone, onChange: (event: IntensityChangeEvent) => void): HTMLElement {
    this.currentTone = tone;
    this.onChangeCallback = onChange;
    
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-tone-intensity';
    
    this.render();
    this.applyStyles();
    
    return this.container;
  }

  /**
   * Render the slider UI
   */
  private render(): void {
    if (!this.container || !this.currentTone) return;
    
    const currentLevel = this.getCurrentLevel();
    
    this.container.innerHTML = `
      <div class="intensity-header">
        <span class="intensity-tone">
          ${this.currentTone.emoji} ${this.currentTone.label}
        </span>
        <span class="intensity-level">${currentLevel.label}</span>
      </div>
      
      <div class="intensity-slider-container">
        <div class="intensity-track">
          <div class="intensity-fill" style="width: ${this.currentIntensity * 100}%"></div>
          <div class="intensity-markers">
            ${this.intensityLevels.map(level => `
              <div class="intensity-marker ${this.currentIntensity === level.value ? 'active' : ''}"
                   data-value="${level.value}"
                   style="left: ${level.value * 100}%">
                <div class="marker-dot"></div>
                <div class="marker-label">${level.label}</div>
              </div>
            `).join('')}
          </div>
          <input type="range" 
                 class="intensity-slider"
                 min="0" 
                 max="1" 
                 step="0.01"
                 value="${this.currentIntensity}">
        </div>
      </div>
      
      <div class="intensity-description">
        ${currentLevel.description}
      </div>
      
      <div class="intensity-preview">
        <div class="preview-label">Preview</div>
        <div class="preview-text">${this.generatePreview()}</div>
      </div>
      
      <div class="intensity-presets">
        ${this.renderPresets()}
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Render preset buttons
   */
  private renderPresets(): string {
    const presets = [
      { value: 0, emoji: '🌱', label: 'Subtle' },
      { value: 0.5, emoji: '⚖️', label: 'Balanced' },
      { value: 1, emoji: '🔥', label: 'Maximum' }
    ];
    
    return presets.map(preset => `
      <button class="intensity-preset ${this.currentIntensity === preset.value ? 'active' : ''}"
              data-value="${preset.value}">
        <span class="preset-emoji">${preset.emoji}</span>
        <span class="preset-label">${preset.label}</span>
      </button>
    `).join('');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Slider input
    const slider = this.container.querySelector('.intensity-slider') as HTMLInputElement;
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.updateIntensity(parseFloat((e.target as HTMLInputElement).value));
      });
      
      slider.addEventListener('change', () => {
        this.notifyChange();
      });
    }
    
    // Marker clicks
    this.container.querySelectorAll('.intensity-marker').forEach(marker => {
      marker.addEventListener('click', (e) => {
        const value = parseFloat((e.currentTarget as HTMLElement).dataset.value || '0.5');
        this.updateIntensity(value);
        this.notifyChange();
      });
    });
    
    // Preset buttons
    this.container.querySelectorAll('.intensity-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const value = parseFloat((e.currentTarget as HTMLElement).dataset.value || '0.5');
        this.animateToValue(value);
      });
    });
  }

  /**
   * Update intensity value
   */
  private updateIntensity(value: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, value));
    
    if (!this.container) return;
    
    // Update UI
    const fill = this.container.querySelector('.intensity-fill') as HTMLElement;
    if (fill) {
      fill.style.width = `${this.currentIntensity * 100}%`;
    }
    
    const currentLevel = this.getCurrentLevel();
    
    // Update level text
    const levelText = this.container.querySelector('.intensity-level');
    if (levelText) {
      levelText.textContent = currentLevel.label;
    }
    
    // Update description
    const description = this.container.querySelector('.intensity-description');
    if (description) {
      description.textContent = currentLevel.description;
    }
    
    // Update preview
    const preview = this.container.querySelector('.preview-text');
    if (preview) {
      preview.textContent = this.generatePreview();
    }
    
    // Update markers
    this.container.querySelectorAll('.intensity-marker').forEach(marker => {
      const markerValue = parseFloat((marker as HTMLElement).dataset.value || '0');
      marker.classList.toggle('active', Math.abs(markerValue - this.currentIntensity) < 0.05);
    });
    
    // Update presets
    this.container.querySelectorAll('.intensity-preset').forEach(btn => {
      const presetValue = parseFloat((btn as HTMLElement).dataset.value || '0');
      btn.classList.toggle('active', Math.abs(presetValue - this.currentIntensity) < 0.05);
    });
    
    // Visual feedback
    visualFeedback.pulse(fill, this.getIntensityColor());
  }

  /**
   * Animate slider to value
   */
  private animateToValue(targetValue: number): void {
    const startValue = this.currentIntensity;
    const duration = 300;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentValue = startValue + (targetValue - startValue) * easeProgress;
      this.updateIntensity(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.notifyChange();
        visualFeedback.showSuccess(this.container!, `Intensity set to ${this.getCurrentLevel().label}`);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Get current intensity level
   */
  private getCurrentLevel(): IntensityLevel {
    // Find closest level
    let closest = this.intensityLevels[0];
    let minDiff = Math.abs(this.currentIntensity - closest.value);
    
    for (const level of this.intensityLevels) {
      const diff = Math.abs(this.currentIntensity - level.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = level;
      }
    }
    
    // Interpolate temperature
    const temperature = this.interpolateTemperature();
    
    return {
      ...closest,
      temperature
    };
  }

  /**
   * Interpolate temperature based on intensity
   */
  private interpolateTemperature(): number {
    // Linear interpolation between 0.3 and 1.0
    return 0.3 + (this.currentIntensity * 0.7);
  }

  /**
   * Get color based on intensity
   */
  private getIntensityColor(): string {
    const hue = 200 - (this.currentIntensity * 60); // Blue to orange
    const saturation = 50 + (this.currentIntensity * 30);
    const lightness = 50;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Generate preview text
   */
  private generatePreview(): string {
    if (!this.currentTone) return '';
    
    const previews: Record<string, string[]> = {
      professional: [
        'I appreciate your perspective on this matter.',
        'Thank you for sharing your insights.',
        'I believe this warrants further consideration.',
        'Your point is well-taken and deserves discussion.',
        'This is indeed a significant development.'
      ],
      witty: [
        'Well, this is interesting!',
        'Plot twist: you\'re absolutely right!',
        'Clever observation there!',
        'Now that\'s what I call thinking outside the box!',
        'Brilliantly put, I must say!'
      ],
      sarcastic: [
        'Oh, how delightful.',
        'Well, isn\'t that just perfect?',
        'Shocking. Truly shocking.',
        'Never saw that coming. Not at all.',
        'What a surprise. I\'m stunned.'
      ]
    };
    
    const tonePreview = previews[this.currentTone.id] || previews.professional;
    const index = Math.floor(this.currentIntensity * (tonePreview.length - 1));
    
    return tonePreview[index];
  }

  /**
   * Notify change callback
   */
  private notifyChange(): void {
    if (!this.currentTone || !this.onChangeCallback) return;
    
    const level = this.getCurrentLevel();
    
    this.onChangeCallback({
      toneId: this.currentTone.id,
      intensity: this.currentIntensity,
      temperature: level.temperature,
      label: level.label
    });
    
    console.log('%c🎚️ Intensity changed:', 'color: #1DA1F2', {
      tone: this.currentTone.label,
      intensity: this.currentIntensity,
      temperature: level.temperature,
      label: level.label
    });
  }

  /**
   * Set intensity programmatically
   */
  setIntensity(value: number): void {
    this.updateIntensity(value);
    this.notifyChange();
  }

  /**
   * Get current intensity
   */
  getIntensity(): number {
    return this.currentIntensity;
  }

  /**
   * Get temperature for current intensity
   */
  getTemperature(): number {
    return this.interpolateTemperature();
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-intensity-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-intensity-styles';
      style.textContent = `
        .tweetcraft-tone-intensity {
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 12px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .intensity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .intensity-tone {
          font-size: 16px;
          font-weight: 600;
          color: #e7e9ea;
        }
        
        .intensity-level {
          padding: 4px 12px;
          background: rgba(29, 155, 240, 0.2);
          border-radius: 12px;
          font-size: 12px;
          color: #1d9bf0;
          font-weight: 500;
        }
        
        .intensity-slider-container {
          position: relative;
          margin: 24px 0;
        }
        
        .intensity-track {
          position: relative;
          height: 40px;
        }
        
        .intensity-fill {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 6px;
          background: linear-gradient(90deg, #657786, #1d9bf0);
          border-radius: 3px;
          transition: width 0.1s ease;
        }
        
        .intensity-markers {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          height: 6px;
        }
        
        .intensity-marker {
          position: absolute;
          transform: translateX(-50%);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .marker-dot {
          width: 16px;
          height: 16px;
          background: #15202b;
          border: 2px solid #657786;
          border-radius: 50%;
          margin: 0 auto;
          transition: all 0.2s;
        }
        
        .intensity-marker.active .marker-dot,
        .intensity-marker:hover .marker-dot {
          width: 20px;
          height: 20px;
          border-color: #1d9bf0;
          background: #1d9bf0;
        }
        
        .marker-label {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #657786;
          white-space: nowrap;
        }
        
        .intensity-slider {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          height: 20px;
          background: transparent;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          opacity: 0;
        }
        
        .intensity-description {
          text-align: center;
          color: #8b98a5;
          font-size: 13px;
          margin: 16px 0;
          font-style: italic;
        }
        
        .intensity-preview {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
        }
        
        .preview-label {
          font-size: 11px;
          color: #657786;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        
        .preview-text {
          color: #e7e9ea;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .intensity-presets {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        
        .intensity-preset {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 20px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .intensity-preset:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: rgba(29, 155, 240, 0.5);
        }
        
        .intensity-preset.active {
          background: rgba(29, 155, 240, 0.2);
          border-color: #1d9bf0;
        }
        
        .preset-emoji {
          font-size: 16px;
        }
        
        .preset-label {
          font-size: 12px;
          font-weight: 500;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.currentTone = null;
    this.onChangeCallback = null;
    
    console.log('%c🎚️ ToneIntensitySlider destroyed', 'color: #FFA500');
  }
}

// Export singleton instance
export const toneIntensitySlider = new ToneIntensitySlider();