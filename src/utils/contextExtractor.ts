/**
 * Context Extractor - Enhanced with Image Understanding
 * Extracts tweet content including text, author, thread context, and images
 */

import { DOMUtils } from '@/content/domUtils';

export interface ImageContext {
  url: string;
  alt?: string;
  type: 'image' | 'gif' | 'video-thumbnail';
  width?: number;
  height?: number;
}

export interface TweetContext {
  tweetId?: string;
  tweetText: string;
  authorHandle?: string;
  authorName?: string;
  threadContext?: Array<{author: string; text: string}>;
  images?: ImageContext[];
  hasVideo?: boolean;
  videoThumbnail?: string;
}

export class ContextExtractor {
  /**
   * Extract complete context from a tweet including images
   */
  static extractFullContext(tweetElement?: Element): TweetContext {
    const context: TweetContext = {
      tweetText: '',
      images: []
    };

    // Find the tweet container if not provided
    const tweet = tweetElement || this.findTweetContainer();
    if (!tweet) {
      console.log('%c❌ No tweet found for context extraction', 'color: #DC3545');
      return context;
    }

    // Extract tweet ID
    context.tweetId = this.extractTweetId(tweet);

    // Extract text content
    const textContent = this.extractTextContent(tweet);
    context.tweetText = textContent.text;
    context.authorHandle = textContent.authorHandle;
    context.authorName = textContent.authorName;

    // Extract images
    context.images = this.extractImages(tweet);

    // Check for video
    const videoInfo = this.extractVideoInfo(tweet);
    context.hasVideo = videoInfo.hasVideo;
    context.videoThumbnail = videoInfo.thumbnail;

    // Extract thread context if it's a reply
    const threadContext = DOMUtils.extractThreadContext();
    if (threadContext && threadContext.length > 0) {
      context.threadContext = threadContext;
    }

    // Only log if debug mode is enabled
    if (typeof window !== 'undefined' && (window as any).__TWEETCRAFT_DEBUG__) {
      console.log('%c📸 Image Context Extraction', 'color: #17BF63; font-weight: bold');
      console.log('%c  Images found:', 'color: #657786', context.images?.length || 0);
      if (context.hasVideo) {
        console.log('%c  Video detected with thumbnail', 'color: #794BC4');
      }
    }

    return context;
  }

  /**
   * Find the tweet container element
   */
  private static findTweetContainer(): Element | null {
    // Try multiple strategies to find the tweet
    const selectors = [
      'article[data-testid="tweet"][tabindex="-1"]', // Main tweet being replied to
      'article[data-testid="tweet"]:first-of-type',   // First tweet in thread
      'div[data-testid="cellInnerDiv"] article'       // Tweet in timeline
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Skip invalid selectors
      }
    }
    
    // Fallback for browsers without :has support
    try {
      // Check if :has is supported
      if (CSS.supports && CSS.supports('selector(:has(div))')) {
        const element = document.querySelector('article[role="article"]:has([data-testid="tweetText"])');
        if (element) return element;
      } else {
        // Fallback: Find article with tweet text inside
        const articles = document.querySelectorAll('article[role="article"]');
        for (const article of articles) {
          if (article.querySelector('[data-testid="tweetText"]')) {
            return article;
          }
        }
      }
    } catch (e) {
      // Fallback failed, continue
    }

    return null;
  }

  /**
   * Extract tweet ID from various sources
   */
  private static extractTweetId(tweet: Element): string | undefined {
    // Try to find tweet ID from links
    const statusLink = tweet.querySelector('a[href*="/status/"]');
    if (statusLink) {
      const match = statusLink.getAttribute('href')?.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    // Try from time element
    const timeLink = tweet.querySelector('time')?.parentElement;
    if (timeLink?.tagName === 'A') {
      const match = timeLink.getAttribute('href')?.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    return undefined;
  }

  /**
   * Extract text content and author information
   */
  private static extractTextContent(tweet: Element): {
    text: string;
    authorHandle?: string;
    authorName?: string;
  } {
    // Extract tweet text
    const textElement = tweet.querySelector('[data-testid="tweetText"]') ||
                       tweet.querySelector('[lang][dir="auto"]:not([contenteditable])') ||
                       tweet.querySelector('div[lang] span');
    
    const text = textElement?.textContent?.trim() || '';

    // Extract author handle
    const authorLink = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                      tweet.querySelector('a[href^="/"][dir="ltr"]');
    const authorHandle = authorLink?.getAttribute('href')?.replace('/', '') || undefined;

    // Extract author display name
    const authorNameElement = tweet.querySelector('[data-testid="User-Name"] span') ||
                             tweet.querySelector('a[href^="/"] span[dir="auto"]');
    const authorName = authorNameElement?.textContent?.trim() || undefined;

    return { text, authorHandle, authorName };
  }

  /**
   * Extract images from tweet
   */
  private static extractImages(tweet: Element): ImageContext[] {
    const images: ImageContext[] = [];
    const processedUrls = new Set<string>();

    // Strategy 1: Look for images in standard Twitter image containers
    const imageContainers = tweet.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="tweet_image"]');
    imageContainers.forEach(container => {
      const img = container.querySelector('img');
      if (img && img.src) {
        const cleanUrl = this.cleanImageUrl(img.src);
        if (!processedUrls.has(cleanUrl)) {
          processedUrls.add(cleanUrl);
          images.push({
            url: cleanUrl,
            alt: img.alt || undefined,
            type: 'image',
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined
          });
        }
      }
    });

    // Strategy 2: Look for any images within the tweet that look like media
    const allImages = tweet.querySelectorAll('img[src*="pbs.twimg.com"], img[src*="ton.twitter.com"]');
    allImages.forEach(img => {
      const src = (img as HTMLImageElement).src;
      // Filter out avatars and small images
      if (src && !src.includes('profile_images') && !src.includes('emoji')) {
        const cleanUrl = this.cleanImageUrl(src);
        if (!processedUrls.has(cleanUrl)) {
          processedUrls.add(cleanUrl);
          images.push({
            url: cleanUrl,
            alt: (img as HTMLImageElement).alt || undefined,
            type: src.includes('.gif') ? 'gif' : 'image',
            width: (img as HTMLImageElement).naturalWidth || undefined,
            height: (img as HTMLImageElement).naturalHeight || undefined
          });
        }
      }
    });

    // Strategy 3: Look for images in link previews (cards)
    const cardImages = tweet.querySelectorAll('[data-testid="card.layoutLarge.media"] img, [data-testid="card.layoutSmall.media"] img');
    cardImages.forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src) {
        const cleanUrl = this.cleanImageUrl(src);
        if (!processedUrls.has(cleanUrl)) {
          processedUrls.add(cleanUrl);
          images.push({
            url: cleanUrl,
            alt: (img as HTMLImageElement).alt || 'Link preview image',
            type: 'image'
          });
        }
      }
    });

    return images;
  }

  /**
   * Extract video information
   */
  private static extractVideoInfo(tweet: Element): {
    hasVideo: boolean;
    thumbnail?: string;
  } {
    // Check for video player
    const videoPlayer = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="gifPlayer"], video');
    if (!videoPlayer) {
      return { hasVideo: false };
    }

    // Try to extract thumbnail
    let thumbnail: string | undefined;

    // Strategy 1: Look for video poster attribute
    const video = tweet.querySelector('video');
    if (video?.poster) {
      thumbnail = this.cleanImageUrl(video.poster);
    }

    // Strategy 2: Look for thumbnail in video container
    if (!thumbnail) {
      const videoContainer = videoPlayer.closest('[data-testid="videoComponent"]');
      const thumbImg = videoContainer?.querySelector('img');
      if (thumbImg?.src) {
        thumbnail = this.cleanImageUrl(thumbImg.src);
      }
    }

    // Strategy 3: Look for preview image that appears before video loads
    if (!thumbnail) {
      const previewImg = videoPlayer.parentElement?.querySelector('img[src*="pbs.twimg.com"]');
      if (previewImg && (previewImg as HTMLImageElement).src) {
        thumbnail = this.cleanImageUrl((previewImg as HTMLImageElement).src);
      }
    }

    return {
      hasVideo: true,
      thumbnail
    };
  }

  /**
   * Clean and optimize image URLs
   */
  private static cleanImageUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove Twitter image sizing parameters for better quality
      if (url.includes('pbs.twimg.com')) {
        // Remove format and name parameters, keep the base URL
        const pathParts = urlObj.pathname.split('.');
        if (pathParts.length > 1) {
          const extension = pathParts[pathParts.length - 1].split('?')[0];
          const basePath = pathParts.slice(0, -1).join('.');
          // Request large size for better vision model analysis
          return `${urlObj.origin}${basePath}?format=${extension}&name=large`;
        }
      }

      // Return clean URL without unnecessary parameters
      return urlObj.origin + urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Extract context for HypeFury platform
   */
  static extractHypeFuryContext(container: Element): TweetContext {
    // This is a placeholder for HypeFury-specific extraction
    // The existing HypeFuryPlatform.extractContext can be enhanced here
    const context: TweetContext = {
      tweetText: '',
      images: []
    };

    // Use existing HypeFury extraction as base
    const hypeFuryContext = (window as any).HypeFuryPlatform?.extractContext(container);
    if (hypeFuryContext) {
      context.tweetText = hypeFuryContext.text || '';
      context.authorHandle = hypeFuryContext.author || undefined;
    }

    // Look for images in HypeFury's structure
    const images = container.querySelectorAll('img:not([class*="avatar"]):not([class*="profile"])');
    images.forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src && !src.includes('emoji') && !src.includes('icon')) {
        context.images?.push({
          url: src,
          alt: (img as HTMLImageElement).alt || undefined,
          type: 'image'
        });
      }
    });

    return context;
  }

  /**
   * Check if context has visual content that needs analysis
   */
  static hasVisualContent(context: TweetContext): boolean {
    return !!(context.images && context.images.length > 0) || !!context.hasVideo;
  }

  /**
   * Prepare context for vision model analysis
   */
  static prepareForVisionAnalysis(context: TweetContext): {
    text: string;
    imageUrls: string[];
    needsVision: boolean;
  } {
    const imageUrls: string[] = [];

    // Collect image URLs
    if (context.images) {
      imageUrls.push(...context.images.map(img => img.url));
    }

    // Add video thumbnail if available
    if (context.videoThumbnail) {
      imageUrls.push(context.videoThumbnail);
    }

    return {
      text: context.tweetText,
      imageUrls,
      needsVision: imageUrls.length > 0
    };
  }
}