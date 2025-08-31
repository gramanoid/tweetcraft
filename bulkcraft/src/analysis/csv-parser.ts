import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { Tweet } from '../types';

export class CSVParser {
  async parseTweetsFromCSV(filePath: string): Promise<Tweet[]> {
    return new Promise((resolve, reject) => {
      const tweets: Tweet[] = [];
      
      createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
        }))
        .on('data', (row) => {
          tweets.push(this.mapRowToTweet(row));
        })
        .on('error', reject)
        .on('end', () => resolve(tweets));
    });
  }

  private mapRowToTweet(row: any): Tweet {
    return {
      id: row['Post id'],
      date: this.parseDate(row['Date']),
      text: row['Post text'],
      link: row['Post Link'],
      impressions: parseInt(row['Impressions']) || 0,
      likes: parseInt(row['Likes']) || 0,
      engagements: parseInt(row['Engagements']) || 0,
      bookmarks: parseInt(row['Bookmarks']) || 0,
      shares: parseInt(row['Shares']) || 0,
      newFollows: parseInt(row['New follows']) || 0,
      replies: parseInt(row['Replies']) || 0,
      reposts: parseInt(row['Reposts']) || 0,
      profileVisits: parseInt(row['Profile visits']) || 0,
      detailExpands: parseInt(row['Detail Expands']) || 0,
      urlClicks: parseInt(row['URL Clicks']) || 0,
      hashtagClicks: parseInt(row['Hashtag Clicks']) || 0,
      permalinkClicks: parseInt(row['Permalink Clicks']) || 0,
    };
  }

  private parseDate(dateStr: string): Date {
    // Handle format like "Fri, Aug 22, 2025"
    return new Date(dateStr);
  }
}