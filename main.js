import dotenv from 'dotenv';
import { Scraper } from 'agent-twitter-client';
import {
  extractTokenAddress,
  loadProcessedTweets,
  monitorTweets,
} from './index.js';

dotenv.config();

(async function startMonitoring() {
  console.log('Logging into Twitter...');
  const scraper = new Scraper();

  try {
    await scraper.login(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD
    );
    console.log('Logged in successfully.');

    const monitor = async () => {
      const processedTweets = await loadProcessedTweets();
      await monitorTweets(scraper, processedTweets, extractTokenAddress);
    };

    // Every 5 minutes
    setInterval(monitor, 5 * 60_000);

    // Initial run
    await monitor();
  } catch (err) {
    console.error('Failed to log in:', err);
  }
})();
