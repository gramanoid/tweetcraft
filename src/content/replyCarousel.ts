/**
 * Reply Carousel Component
 * Displays multiple AI-generated reply suggestions in a carousel format
 */

export interface ReplyOption {
  id: string;
  text: string;
  tone: string;
  timestamp: number;
}

export class ReplyCarousel {
  private container: HTMLElement | null = null;
  private currentIndex = 0;
  private replies: ReplyOption[] = [];
  private onSelect: ((text: string) => void) | null = null;
  private onRegenerate: ((index: number) => void) | null = null;

  create(
    onSelect: (text: string) => void,
    onRegenerate: (index: number) => void
  ): HTMLElement {
    this.onSelect = onSelect;
    this.onRegenerate = onRegenerate;

    // Create carousel container
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-reply-carousel';
    this.container.style.cssText = `
      background: white;
      border: 1px solid #cfd9de;
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: none;
    `;

    this.render();
    return this.container;
  }

  setReplies(replies: ReplyOption[]): void {
    this.replies = replies;
    this.currentIndex = 0;
    this.render();
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  private render(): void {
    if (!this.container) return;

    const currentReply = this.replies[this.currentIndex];
    
    this.container.innerHTML = `
      <div class="carousel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: #0f1419;">
            Suggestion ${this.currentIndex + 1} of ${this.replies.length}
          </span>
          ${currentReply ? `<span style="font-size: 12px; color: #536471;">(${currentReply.tone})</span>` : ''}
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="carousel-prev" ${this.currentIndex === 0 ? 'disabled' : ''} style="
            padding: 4px 8px;
            border: 1px solid #cfd9de;
            border-radius: 4px;
            background: white;
            cursor: ${this.currentIndex === 0 ? 'not-allowed' : 'pointer'};
            opacity: ${this.currentIndex === 0 ? '0.5' : '1'};
          ">←</button>
          <button class="carousel-next" ${this.currentIndex === this.replies.length - 1 ? 'disabled' : ''} style="
            padding: 4px 8px;
            border: 1px solid #cfd9de;
            border-radius: 4px;
            background: white;
            cursor: ${this.currentIndex === this.replies.length - 1 ? 'not-allowed' : 'pointer'};
            opacity: ${this.currentIndex === this.replies.length - 1 ? '0.5' : '1'};
          ">→</button>
        </div>
      </div>
      
      <div class="carousel-content" style="
        padding: 12px;
        background: #f7f9fa;
        border-radius: 8px;
        margin-bottom: 12px;
        min-height: 80px;
        max-height: 150px;
        overflow-y: auto;
      ">
        ${currentReply ? 
          `<p style="margin: 0; font-size: 14px; line-height: 1.4; color: #0f1419;">${currentReply.text}</p>` :
          `<div style="display: flex; align-items: center; justify-content: center; height: 80px;">
            <div class="spinner" style="
              width: 24px;
              height: 24px;
              border: 3px solid #cfd9de;
              border-top-color: #1d9bf0;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
          </div>`
        }
      </div>
      
      <div class="carousel-actions" style="display: flex; gap: 8px;">
        <button class="use-reply" style="
          flex: 1;
          padding: 8px 16px;
          background: #1d9bf0;
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        " ${!currentReply ? 'disabled' : ''}>
          Use This Reply
        </button>
        <button class="regenerate-reply" style="
          padding: 8px 16px;
          background: white;
          color: #1d9bf0;
          border: 1px solid #1d9bf0;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        " ${!currentReply ? 'disabled' : ''}>
          🔄 Regenerate
        </button>
      </div>
      
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .use-reply:hover:not(:disabled) {
          background: #1a8cd8 !important;
        }
        .regenerate-reply:hover:not(:disabled) {
          background: #e8f5fe !important;
        }
      </style>
    `;

    // Add event listeners
    const prevBtn = this.container.querySelector('.carousel-prev');
    const nextBtn = this.container.querySelector('.carousel-next');
    const useBtn = this.container.querySelector('.use-reply');
    const regenBtn = this.container.querySelector('.regenerate-reply');

    prevBtn?.addEventListener('click', () => this.navigate(-1));
    nextBtn?.addEventListener('click', () => this.navigate(1));
    
    useBtn?.addEventListener('click', () => {
      const reply = this.replies[this.currentIndex];
      if (reply && this.onSelect) {
        this.onSelect(reply.text);
        this.hide();
      }
    });
    
    regenBtn?.addEventListener('click', () => {
      if (this.onRegenerate) {
        this.onRegenerate(this.currentIndex);
      }
    });
  }

  private navigate(direction: number): void {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.replies.length) {
      this.currentIndex = newIndex;
      this.render();
    }
  }

  updateReply(index: number, reply: ReplyOption): void {
    if (index >= 0 && index < this.replies.length) {
      this.replies[index] = reply;
      if (index === this.currentIndex) {
        this.render();
      }
    }
  }

  showLoading(index: number): void {
    if (index >= 0 && index < this.replies.length) {
      // Temporarily clear the reply to show loading state
      const originalReply = this.replies[index];
      this.replies[index] = { ...originalReply, text: '' };
      if (index === this.currentIndex) {
        this.render();
      }
    }
  }
}

export const replyCarousel = new ReplyCarousel();