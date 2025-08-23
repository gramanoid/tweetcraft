/**
 * Utility functions for cleaning URLs and removing tracking parameters
 */

export class URLCleaner {
  // Common tracking parameters used by various services
  private static readonly TRACKING_PARAMS = new Set([
    // Twitter/X specific
    's', 't', 'ref_src', 'ref_url', 'ref', 'src', 'campaign',
    
    // Google Analytics
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
    
    // Facebook
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
    
    // Amazon
    'tag', 'linkCode', 'linkId', 'ref_', 'pf_rd_p', 'pf_rd_r', 'pd_rd_r', 
    'pd_rd_w', 'pd_rd_wg', 'psc', 'refRID',
    
    // YouTube
    'feature', 'si', 'pp', 'ab_channel',
    
    // General tracking
    'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'twclid',
    'mc_cid', 'mc_eid', '_ga', 'gclsrc', 'yclid',
    
    // Email tracking
    'mkt_tok', 'trk', 'trkInfo', 'oly_enc_id', 'oly_anon_id',
    '_hsenc', '_hsmi', '__hstc', '__hssc', '__hsfp',
    
    // Social media
    'igshid', 'share_id', 'share_token'
  ]);

  /**
   * Clean a URL by removing tracking parameters
   */
  static cleanURL(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters
      const params = new URLSearchParams(urlObj.search);
      let hasChanges = false;
      
      for (const param of Array.from(params.keys())) {
        if (this.TRACKING_PARAMS.has(param.toLowerCase())) {
          params.delete(param);
          hasChanges = true;
        }
      }
      
      // Rebuild URL only if we made changes
      if (hasChanges) {
        urlObj.search = params.toString();
        return urlObj.toString();
      }
      
      return url;
    } catch (error) {
      // If it's not a valid URL, return as-is
      return url;
    }
  }

  /**
   * Clean all URLs found in text
   */
  static cleanTextURLs(text: string): string {
    // Regular expression to match URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    
    return text.replace(urlRegex, (match) => {
      return this.cleanURL(match);
    });
  }

  /**
   * Extract and clean URLs from text, returning both cleaned text and list of cleaned URLs
   */
  static extractAndCleanURLs(text: string): { cleanedText: string; urls: string[] } {
    const urls: string[] = [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    
    const cleanedText = text.replace(urlRegex, (match) => {
      const cleanedURL = this.cleanURL(match);
      urls.push(cleanedURL);
      return cleanedURL;
    });
    
    return {
      cleanedText,
      urls
    };
  }
}