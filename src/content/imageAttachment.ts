/**
 * Image Attachment UI for TweetCraft
 * Allows users to attach AI-generated or web-searched images to replies
 */

import { imageService, ImageResult } from '@/services/imageService';
import { visualFeedback } from '@/ui/visualFeedback';

export class ImageAttachment {
  private container: HTMLElement | null = null;
  private selectedImage: ImageResult | null = null;
  private onImageSelect: ((image: ImageResult | null) => void) | null = null;
  private textarea: HTMLElement | null = null;
  
  constructor() {
    console.log('%c🖼️ ImageAttachment initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Create image attachment button
   */
  createButton(textarea: HTMLElement, replyText: string = ''): HTMLButtonElement {
    this.textarea = textarea;
    
    const button = document.createElement('button');
    button.className = 'tweetcraft-image-button';
    button.innerHTML = '🖼️';
    button.setAttribute('title', 'Add Image (AI Generate or Search)');
    button.style.cssText = `
      background: transparent;
      border: 1px solid #536471;
      border-radius: 9999px;
      padding: 8px 12px;
      cursor: pointer;
      color: #536471;
      margin-left: 8px;
      transition: all 0.2s;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.borderColor = '#9146FF';
      button.style.color = '#9146FF';
      button.style.background = 'rgba(145, 70, 255, 0.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.borderColor = '#536471';
      button.style.color = '#536471';
      button.style.background = 'transparent';
    });

    // Click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      visualFeedback.pulse(button, '#9146FF');
      this.showImagePanel(button, replyText);
    });

    return button;
  }

  /**
   * Show image selection panel
   */
  private showImagePanel(button: HTMLElement, replyText: string): void {
    // Remove any existing panel
    if (this.container) {
      this.container.remove();
    }

    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-image-panel';
    this.container.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      width: 400px;
      max-height: 500px;
      z-index: 10000;
      margin-bottom: 8px;
      overflow-y: auto;
    `;

    // Dark mode support
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.container.style.background = '#000';
      this.container.style.borderColor = '#2f3336';
    }

    this.container.innerHTML = `
      <div class="image-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🖼️ Add Image</h3>
        <button class="close-panel" style="background: transparent; border: none; cursor: pointer; font-size: 20px; color: #536471;">×</button>
      </div>
      
      <div class="image-tabs" style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button class="tab-btn active" data-tab="search" style="flex: 1; padding: 8px; border: 1px solid #1d9bf0; background: #1d9bf0; color: white; border-radius: 8px; cursor: pointer; font-size: 14px;">
          🔍 Search Web
        </button>
        <button class="tab-btn" data-tab="generate" style="flex: 1; padding: 8px; border: 1px solid #e1e8ed; background: transparent; color: #536471; border-radius: 8px; cursor: pointer; font-size: 14px;">
          🎨 AI Generate
        </button>
        <button class="tab-btn" data-tab="suggest" style="flex: 1; padding: 8px; border: 1px solid #e1e8ed; background: transparent; color: #536471; border-radius: 8px; cursor: pointer; font-size: 14px;">
          💡 Suggest
        </button>
      </div>
      
      <div class="tab-content" id="search-content">
        <input type="text" class="image-search-input" placeholder="Search for images..." style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; margin-bottom: 12px;">
        <button class="search-btn" style="width: 100%; padding: 10px; background: #1d9bf0; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 12px;">
          Search Images
        </button>
        <div class="search-results" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;"></div>
      </div>
      
      <div class="tab-content" id="generate-content" style="display: none;">
        <textarea class="image-prompt-input" placeholder="Describe the image you want to generate..." style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; margin-bottom: 12px; min-height: 80px; resize: vertical;"></textarea>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <select class="style-select" style="flex: 1; padding: 8px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px;">
            <option value="realistic">Realistic</option>
            <option value="artistic">Artistic</option>
            <option value="cartoon">Cartoon</option>
            <option value="sketch">Sketch</option>
          </select>
          <select class="size-select" style="flex: 1; padding: 8px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px;">
            <option value="512x512">512x512</option>
            <option value="1024x1024">1024x1024</option>
          </select>
        </div>
        <button class="generate-btn" style="width: 100%; padding: 10px; background: #9146FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 12px;">
          Generate Image
        </button>
        <div class="generate-result"></div>
      </div>
      
      <div class="tab-content" id="suggest-content" style="display: none;">
        <p style="font-size: 14px; color: #536471; margin-bottom: 12px;">Suggested images based on your reply:</p>
        <button class="suggest-btn" style="width: 100%; padding: 10px; background: #FFA500; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 12px;">
          Get Suggestions
        </button>
        <div class="suggest-results" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;"></div>
      </div>
      
      <div class="selected-image-preview" style="margin-top: 16px; display: none;">
        <div style="font-size: 12px; color: #536471; margin-bottom: 8px;">Selected Image:</div>
        <img class="preview-img" style="width: 100%; border-radius: 8px; margin-bottom: 8px;">
        <div style="display: flex; gap: 8px;">
          <button class="use-image-btn" style="flex: 1; padding: 8px; background: #17BF63; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
            ✓ Use This Image
          </button>
          <button class="remove-image-btn" style="padding: 8px 16px; background: #DC3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
            Remove
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners();

    // Position relative to button
    const buttonContainer = button.parentElement;
    if (buttonContainer) {
      buttonContainer.style.position = 'relative';
      buttonContainer.appendChild(this.container);
    }

    // Auto-suggest if reply text exists
    if (replyText) {
      this.autoSuggestImages(replyText);
    }
  }

  /**
   * Attach event listeners to panel
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('.close-panel') as HTMLElement;
    closeBtn?.addEventListener('click', () => this.close());

    // Tab switching
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.dataset.tab;
        
        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        // Update tab styles
        tabBtns.forEach(b => {
          const button = b as HTMLElement;
          if (b === target) {
            button.style.background = '#1d9bf0';
            button.style.color = 'white';
            button.style.borderColor = '#1d9bf0';
          } else {
            button.style.background = 'transparent';
            button.style.color = '#536471';
            button.style.borderColor = '#e1e8ed';
          }
        });
        
        // Show corresponding content
        this.container?.querySelectorAll('.tab-content').forEach(content => {
          const el = content as HTMLElement;
          el.style.display = content.id === `${tab}-content` ? 'block' : 'none';
        });
      });
    });

    // Search functionality
    const searchBtn = this.container.querySelector('.search-btn') as HTMLElement;
    const searchInput = this.container.querySelector('.image-search-input') as HTMLInputElement;
    
    searchBtn?.addEventListener('click', async () => {
      const query = searchInput?.value.trim();
      if (query) {
        await this.searchImages(query);
      }
    });
    
    searchInput?.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          await this.searchImages(query);
        }
      }
    });

    // Generate functionality
    const generateBtn = this.container.querySelector('.generate-btn') as HTMLElement;
    const promptInput = this.container.querySelector('.image-prompt-input') as HTMLTextAreaElement;
    const styleSelect = this.container.querySelector('.style-select') as HTMLSelectElement;
    const sizeSelect = this.container.querySelector('.size-select') as HTMLSelectElement;
    
    generateBtn?.addEventListener('click', async () => {
      const prompt = promptInput?.value.trim();
      if (prompt) {
        await this.generateImage(prompt, styleSelect?.value, sizeSelect?.value);
      }
    });

    // Suggest functionality
    const suggestBtn = this.container.querySelector('.suggest-btn') as HTMLElement;
    suggestBtn?.addEventListener('click', async () => {
      await this.suggestImages();
    });

    // Selected image actions
    const useImageBtn = this.container.querySelector('.use-image-btn') as HTMLElement;
    const removeImageBtn = this.container.querySelector('.remove-image-btn') as HTMLElement;
    
    useImageBtn?.addEventListener('click', () => {
      if (this.selectedImage && this.onImageSelect) {
        this.onImageSelect(this.selectedImage);
        visualFeedback.showToast('Image attached to reply', {
          type: 'success',
          duration: 2000
        });
        this.close();
      }
    });
    
    removeImageBtn?.addEventListener('click', () => {
      this.selectedImage = null;
      const preview = this.container?.querySelector('.selected-image-preview') as HTMLElement;
      if (preview) {
        preview.style.display = 'none';
      }
    });
  }

  /**
   * Search for images
   */
  private async searchImages(query: string): Promise<void> {
    const resultsDiv = this.container?.querySelector('.search-results') as HTMLElement;
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">Searching...</div>';

    try {
      const results = await imageService.searchImages({
        query,
        limit: 4,
        safeSearch: true
      });

      this.displayImages(results, resultsDiv);
    } catch (error) {
      console.error('Failed to search images:', error);
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #DC3545;">Failed to search images</div>';
    }
  }

  /**
   * Generate AI image
   */
  private async generateImage(prompt: string, style?: string, size?: string): Promise<void> {
    const resultDiv = this.container?.querySelector('.generate-result') as HTMLElement;
    if (!resultDiv) return;

    resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">Generating image...</div>';

    try {
      const result = await imageService.generateImage({
        prompt,
        style: style as any,
        size: size as any
      });

      this.displayImages([result], resultDiv);
    } catch (error) {
      console.error('Failed to generate image:', error);
      resultDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #DC3545;">Failed to generate image. Make sure API key is configured.</div>';
    }
  }

  /**
   * Suggest images based on context
   */
  private async suggestImages(): Promise<void> {
    const resultsDiv = this.container?.querySelector('.suggest-results') as HTMLElement;
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">Finding suggestions...</div>';

    try {
      // Get tweet text from the page
      const tweetText = this.getTweetText();
      const replyText = this.getReplyText();

      const results = await imageService.suggestImages(tweetText, replyText);
      
      if (results.length > 0) {
        this.displayImages(results, resultsDiv);
      } else {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #536471;">No suggestions available. Try searching or generating.</div>';
      }
    } catch (error) {
      console.error('Failed to suggest images:', error);
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #DC3545;">Failed to get suggestions</div>';
    }
  }

  /**
   * Auto-suggest images on panel open
   */
  private async autoSuggestImages(replyText: string): Promise<void> {
    // Switch to suggest tab
    const suggestTab = this.container?.querySelector('[data-tab="suggest"]') as HTMLElement;
    if (suggestTab) {
      suggestTab.click();
      // Automatically get suggestions
      await this.suggestImages();
    }
  }

  /**
   * Display images in grid
   */
  private displayImages(images: ImageResult[], container: HTMLElement): void {
    if (images.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #536471;">No images found</div>';
      return;
    }

    container.innerHTML = '';
    
    images.forEach(image => {
      const imgDiv = document.createElement('div');
      imgDiv.style.cssText = `
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        aspect-ratio: 1;
        background: #f0f0f0;
      `;
      
      const img = document.createElement('img');
      img.src = image.thumbnail || image.url;
      img.alt = image.alt;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.2s;
      `;
      
      // Hover effect
      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.05)';
      });
      img.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
      });
      
      // Click to select
      imgDiv.addEventListener('click', () => {
        this.selectImage(image);
      });
      
      imgDiv.appendChild(img);
      container.appendChild(imgDiv);
    });
  }

  /**
   * Select an image
   */
  private selectImage(image: ImageResult): void {
    this.selectedImage = image;
    
    const preview = this.container?.querySelector('.selected-image-preview') as HTMLElement;
    const previewImg = this.container?.querySelector('.preview-img') as HTMLImageElement;
    
    if (preview && previewImg) {
      previewImg.src = image.url;
      previewImg.alt = image.alt;
      preview.style.display = 'block';
      
      // Scroll to preview
      preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    visualFeedback.showToast('Image selected', {
      type: 'info',
      duration: 1500
    });
  }

  /**
   * Get tweet text from page
   */
  private getTweetText(): string {
    // Find the tweet being replied to
    const article = this.textarea?.closest('article');
    if (article) {
      const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
      return tweetTextElement?.textContent || '';
    }
    return '';
  }

  /**
   * Get current reply text
   */
  private getReplyText(): string {
    if (this.textarea) {
      return this.textarea.textContent || '';
    }
    return '';
  }

  /**
   * Set callback for image selection
   */
  onSelect(callback: (image: ImageResult | null) => void): void {
    this.onImageSelect = callback;
  }

  /**
   * Close the panel
   */
  close(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

// Export singleton instance
export const imageAttachment = new ImageAttachment();