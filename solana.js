import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import dotenv from 'dotenv';

dotenv.config();

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const SLIPPAGE_BPS = 1500; // 15% slippage in basis points (bps)

function getWallet() {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PRIVATE_KEY)));
}

// Function to buy a token using Jupiter API
async function buyToken(tokenAddress, amount) {
  console.log(`Preparing to buy $${amount} worth of token: ${tokenAddress}...`);

  const connection = new Connection(RPC_ENDPOINT);
  const wallet = getWallet();

  // Initialize Jupiter API client
  const jupiterApi = createJupiterApiClient();

  // SOL token (inputMint) address
  const inputMint = 'So11111111111111111111111111111111111111112';

  // Amount in lamports (1 SOL = 10^9 lamports)
  const amountLamports = amount * 10 ** 9;

  try {
    // Fetch quote
    const quoteResponse = await jupiterApi.quoteGet({
      inputMint,
      outputMint: tokenAddress,
      amount: amountLamports.toString(),
      slippageBps: SLIPPAGE_BPS,
      asLegacyTransaction: false, 
    });

    if (!quoteResponse.data || quoteResponse.data.length === 0) {
      console.error('No valid routes found for the swap.');
      return;
    }

    // Use the best route from the quote
    const bestRoute = quoteResponse.data[0];

    console.log('Best route found:', bestRoute);

    // Send the transaction to execute the swap
    const { transaction } = bestRoute;
    const signedTransaction = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTransaction.serialize());

    console.log(`Transaction sent with ID: ${txid}`);
    const confirmationStrategy = {
        signature: txid,
        commitment: 'confirmed',
    };
  
    const confirmation = await connection.confirmTransaction(confirmationStrategy);
  
    if (confirmation.value.err) {
        console.error('Transaction failed:', confirmation.value.err);
        } else {
            console.log('Swap successfully completed!');
        }
    } catch (error) {
      console.error('Error during token swap:', error.message);
    }
}

export { buyToken };
