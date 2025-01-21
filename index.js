import { Scraper } from 'agent-twitter-client';
import { sendEmail } from './resend.js';
import { buyToken } from './solana.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const PROCESSED_TWEETS_FILE = path.resolve('processed-tweets.json');

// Twitter Scraper Configuration
const twitterConfig = {
  username: process.env.TWITTER_USERNAME,
  password: process.env.TWITTER_PASSWORD,
  email: process.env.TWITTER_EMAIL,
};

// Helper functions to get accounts and keywords to monitor
export function getAccountsToMonitor() {
  // Fallback if not provided
  return process.env.ACCOUNTS_TO_MONITOR
    ? process.env.ACCOUNTS_TO_MONITOR.split(',')
    : [];
}

export function getKeywordsToMonitor() {
  return process.env.KEYWORDS_TO_MONITOR
    ? process.env.KEYWORDS_TO_MONITOR.split(',')
    : [];
}

// Helper function to extract token addresses
export function extractTokenAddress(tweetText) {
  console.log(`Extracting token address from tweet: ${tweetText}`);
  const regex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g; // Regex for Solana addresses
  const matches = tweetText.match(regex) || [];
  console.log(`Found addresses: ${matches}`);
  return matches;
}

// Load processed tweet IDs from file
export async function loadProcessedTweets() {
  try {
    const data = await fs.readFile(PROCESSED_TWEETS_FILE, 'utf8');
    return new Set(JSON.parse(data));
  } catch (err) {
    console.log('No existing processed tweets file found. Starting fresh.');
    return new Set();
  }
}

// Save processed tweet IDs to file
export async function saveProcessedTweets(processedTweets) {
  try {
    const data = JSON.stringify(Array.from(processedTweets));
    await fs.writeFile(PROCESSED_TWEETS_FILE, data, 'utf8');
    console.log('Processed tweets saved.');
  } catch (err) {
    console.error('Error saving processed tweets:', err);
  }
}

// Monitor tweets and update processed tweets
export async function monitorTweets(scraper, processedTweets, extractTokenAddress) {
  const accountsToMonitor = getAccountsToMonitor();
  const keywords = getKeywordsToMonitor();

  console.log('Starting tweet monitoring...');

  for (const account of accountsToMonitor) {
    console.log(`\n--- Monitoring tweets for @${account} ---`);

    try {
      const userId = await scraper.getUserIdByScreenName(account);
      if (!userId) {
        console.error(`Failed to fetch user ID for @${account}. Skipping.`);
        continue;
      }
      console.log(`Fetched user ID for @${account}: ${userId}`);

      const response = await scraper.getUserTweets(userId, 2);
      const tweets = response.tweets || [];
      if (tweets.length === 0) {
        console.log(`No tweets found for @${account}.`);
        continue;
      }

      // Filter out tweets already processed
      const newTweets = tweets.filter((tweet) => !processedTweets.has(tweet.id));
      if (newTweets.length === 0) {
        console.log(`No new tweets to process for @${account}.`);
        continue;
      }

      for (const tweet of newTweets) {
        console.log(`Analyzing tweet: ${tweet.text}`);

        if (keywords.some((keyword) => tweet.text.includes(keyword))) {
          console.log(`Keyword match found in tweet: ${tweet.text}`);
          processedTweets.add(tweet.id);

          let emailMessage = `Keyword match found in tweet:\n\n${tweet.text}\n\nLink: https://twitter.com/${account}/status/${tweet.id}`;

          // Extract token addresses from the tweet
          const tokenAddresses = extractTokenAddress(tweet.text);
          console.log(`Extracted token addresses: ${tokenAddresses}`);

          if (tokenAddresses.length > 0) {
            for (const tokenAddress of tokenAddresses) {
              console.log(`Found token address: ${tokenAddress}`);
              emailMessage += `\n\nFound token address: ${tokenAddress}\nAttempting to buy...`;

              // Attempt to buy the token
              await buyToken(tokenAddress, 20); // $20 worth
            }
          } else {
            emailMessage += `\n\nNo token address found.`;
          }

          // Send email notification
          console.log('Sending email notification...');
          await sendEmail({
            to: process.env.NOTIFICATION_EMAIL,
            subject: `Twitter Alert: Keyword Match for @${account}`,
            html: `<p>${emailMessage.replace(/\n/g, '<br>')}</p>`,
          });
        }
      }
    } catch (error) {
      console.error(`Error monitoring tweets for @${account}:`, error);
    }
  }

  // Save updated processed tweets
  await saveProcessedTweets(processedTweets);
  console.log('Processed tweets saved.');
  console.log(`Number of processed tweets: ${processedTweets.size}`);
}
