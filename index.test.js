import {
  extractTokenAddress,
  loadProcessedTweets,
  saveProcessedTweets,
  monitorTweets,
} from './index';

import { Scraper } from 'agent-twitter-client';
import { sendEmail } from './resend.js';
import { buyToken } from './solana.js';
import fs from 'fs/promises';
import path from 'path';

// Mock dotenv to prevent actual environment config in tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock the Scraper from 'agent-twitter-client'
jest.mock('agent-twitter-client', () => {
  const mockScraperInstance = {
    login: jest.fn(),
    getUserIdByScreenName: jest.fn(),
    getUserTweets: jest.fn(),
  };

  // Return a class-like function that always gives the mockScraperInstance
  return {
    Scraper: jest.fn(() => mockScraperInstance),
  };
});

// Mock the sendEmail function from './resend.js'
jest.mock('./resend.js', () => ({
  sendEmail: jest.fn(),
}));

// Mock the buyToken function from './solana.js'
jest.mock('./solana.js', () => ({
  buyToken: jest.fn(),
}));

// Mock file system methods readFile and writeFile
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('extractTokenAddress', () => {
  it('should extract valid Solana addresses from tweet text', () => {
    const tweetText = 'Check out this Solana address: FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P';
    const result = extractTokenAddress(tweetText);

    expect(result).toContain('FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P');
  });

  it('should return an empty array if no valid address is found', () => {
    const tweetText = 'Just a random tweet with no token address.';
    const result = extractTokenAddress(tweetText);

    expect(result).toEqual([]);
  });
});

describe('loadProcessedTweets', () => {
  it('should load processed tweets from a JSON file', async () => {
    const mockData = JSON.stringify(['12345', '67890']);
    fs.readFile.mockResolvedValueOnce(mockData);

    const processedTweets = await loadProcessedTweets();
    expect(processedTweets.has('12345')).toBe(true);
    expect(processedTweets.has('67890')).toBe(true);
  });

  it('should return an empty Set if file reading fails', async () => {
    fs.readFile.mockRejectedValueOnce(new Error('File not found'));

    const processedTweets = await loadProcessedTweets();
    expect(processedTweets.size).toBe(0);
  });
});

describe('saveProcessedTweets', () => {
  it('should save processed tweets to a JSON file', async () => {
    const processedTweets = new Set(['abc', 'def']);
    fs.writeFile.mockResolvedValueOnce();

    await saveProcessedTweets(processedTweets);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);

    // Check that the content written matches the processed tweets
    const [filePath, data] = fs.writeFile.mock.calls[0];
    expect(filePath).toBe(path.resolve('processed-tweets.json'));
    expect(JSON.parse(data)).toEqual(['abc', 'def']);
  });
});

describe('monitorTweets', () => {
  let scraperInstance;
  let processedTweetsSet;
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };

    process.env.ACCOUNTS_TO_MONITOR = 'account1,account2,account3';
    process.env.KEYWORDS_TO_MONITOR = 'token,keyword2,keyword3';
  });

  afterAll(() => {
    // Restore the original environment variables
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();

    // Setup the default scraper mock
    scraperInstance = new Scraper();
    scraperInstance.getUserIdByScreenName.mockImplementation((screenName) => {
      switch (screenName) {
        case 'account1':
          return Promise.resolve('mockUserId1');
        case 'account2':
          return Promise.resolve('mockUserId2');
        case 'account3':
          return Promise.resolve('mockUserId3');
        default:
          return Promise.resolve(null);
      }
    });
    // Mock the getUserTweets method to return an empty array
    scraperInstance.getUserTweets.mockImplementation(() =>
      Promise.resolve({ tweets: [] })
    );

    // Create a default processedTweets set
    processedTweetsSet = new Set();
  });

  it('should call sendEmail and buyToken when a keyword match is found and token address is present', async () => {
    // Mock the getUserTweets method to return a tweet with the keyword
    scraperInstance.getUserTweets.mockImplementation((userId) => {
      if (userId === 'mockUserId2') {
        // account2 => tweet with the keyword
        return Promise.resolve({
          tweets: [
            {
              id: '12345',
              text: 'This is a test tweet with a token: FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P',
            },
          ],
        });
      } else {
        // Other accounts => no tweets
        return Promise.resolve({ tweets: [] });
      }
    });

    // Run the function
    await monitorTweets(scraperInstance, processedTweetsSet, extractTokenAddress);

    // After running, we expect:
    // 1. The token address has triggered buyToken
    expect(buyToken).toHaveBeenCalledWith('FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P', 20);
    // 2. An email was sent
    expect(sendEmail).toHaveBeenCalledTimes(1);

    // 3. The tweet ID should now be in the processed tweets set
    expect(processedTweetsSet.has('12345')).toBe(true);

    // 4. Processed tweets saved to the file
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should not call sendEmail or buyToken if there is no keyword match', async () => {
    // Provide a tweet with no matching keywords for all accounts
    scraperInstance.getUserTweets.mockImplementation((userId) => {
      return Promise.resolve({
        tweets: [
          {
            id: '99999',
            text: 'This is just a random tweet with zero relevant keywords.',
          },
        ],
      });
    });

    await monitorTweets(scraperInstance, processedTweetsSet, extractTokenAddress);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(buyToken).not.toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledTimes(1); // Still saves processed tweets
  });

  it('should handle empty tweet arrays gracefully', async () => {
    // Return empty arrays for every account
    scraperInstance.getUserTweets.mockImplementation(() =>
      Promise.resolve({ tweets: [] })
    );

    await monitorTweets(scraperInstance, processedTweetsSet, extractTokenAddress);

    // No tweets, so no action
    expect(sendEmail).not.toHaveBeenCalled();
    expect(buyToken).not.toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledTimes(1); // Still attempts to save
  });

  it('should skip if no userId is returned', async () => {
    // Return null user ID for every account => skip them all
    scraperInstance.getUserIdByScreenName.mockImplementation(() =>
      Promise.resolve(null)
    );

    await monitorTweets(scraperInstance, processedTweetsSet, extractTokenAddress);

    expect(scraperInstance.getUserTweets).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(buyToken).not.toHaveBeenCalled();
  });
});
