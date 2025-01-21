import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

class Scraper {
  constructor() {
    this.cookies = [];
    this.isLoggedIn = false;
  }

  async login(username, password, email, twoFactorSecret) {
    console.log('Logging into Twitter...');
    this.cookies.push(`mock-session-token=${username}`);
    this.isLoggedIn = true;

    if (twoFactorSecret) {
      console.log('Simulating two-factor authentication...');
    }

    console.log('Login successful.');
  }

  async logout() {
    this.cookies = [];
    this.isLoggedIn = false;
    console.log('Logged out.');
  }

  async getProfile(username) {
    console.log(`Fetching profile for @${username}...`);
    const url = `https://twitter.com/${username}`;
    const response = await this._fetch(url);

    const root = parse(response);
    const profile = {
      userId: root.querySelector('[data-user-id]')?.getAttribute('data-user-id'),
      username,
      name: root.querySelector('title')?.textContent?.split('(')[0].trim(),
      avatar: root.querySelector('img[src*="profile_images"]')?.getAttribute('src'),
    };

    console.log(`Profile fetched: ${JSON.stringify(profile)}`);
    return profile;
  }

  async getUserTweets(userId, count = 2) {
    console.log(`Fetching ${count} tweets for user ID ${userId}...`);
    const url = `https://twitter.com/i/api/2/timeline/profile/${userId}.json?count=${count}`;
    const response = await this._fetch(url);

    const data = JSON.parse(response);
    const tweets = data.globalObjects.tweets.map((tweet) => ({
      id: tweet.id_str,
      text: tweet.full_text || tweet.text,
      timestamp: tweet.created_at,
      permanentUrl: `https://twitter.com/${userId}/status/${tweet.id_str}`,
    }));

    console.log(`Tweets fetched: ${JSON.stringify(tweets)}`);
    return tweets;
  }

  extractTokenAddress(tweetText) {
    const base58Regex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    return tweetText.match(base58Regex) || [];
  }

  async _fetch(url) {
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': 'Bearer mock-token',
      'Cookie': this.cookies.join('; '),
    };

    console.log(`Making request to: ${url}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return await response.text();
  }
}

export { Scraper };
