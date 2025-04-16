// add-users.js - Creates and funds multiple new user accounts and updates the JSON file
const xrpl = require('xrpl');
const fs = require('fs');

/**
 * Adds multiple new user accounts to the XRP Ledger
 * @param {number} count - Number of new users to add
 * @param {number} initialTokenAmount - Amount of UNO tokens to transfer to each new user
 * @param {number} trustLineLimit - Trust line limit for each new user
 */
async function addUsers(count = 1, initialTokenAmount = 500, trustLineLimit = 25000) {
  // Validate inputs
  if (count < 1) {
    console.error("Error: Count must be at least 1");
    return;
  }
  
  // Load existing account information
  if (!fs.existsSync('xrpl_accounts.json')) {
    console.error("Error: xrpl_accounts.json file not found.");
    return;
  }

  const accountFile = fs.readFileSync('xrpl_accounts.json');
  const accountInfo = JSON.parse(accountFile);
  
  console.log("Loaded existing account information from xrpl_accounts.json");
  
  // Find the next user number
  let nextUserNumber = 1;
  const existingUsers = Object.keys(accountInfo).filter(key => key.startsWith('user'));
  
  for (const userKey of existingUsers) {
    // Extract the number from keys like "user", "user2", "user3", etc.
    const match = userKey.match(/^user(\d*)$/);
    if (match) {
      const num = match[1] === '' ? 1 : parseInt(match[1]);
      if (num >= nextUserNumber) {
        nextUserNumber = num + 1;
      }
    }
  }

  // Connect to XRPL Testnet
  console.log("Connecting to XRPL Testnet...");
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log("Connected to XRPL Testnet");

  try {
    // Load distributor wallet for token transfers
    const distributorWallet = xrpl.Wallet.fromSeed(accountInfo.distributor.seed);
    
    // Create and set up each new user
    for (let i = 0; i < count; i++) {
      const userNumber = nextUserNumber + i;
      const userKey = userNumber === 1 ? 'user' : `user${userNumber}`;
      
      console.log(`\n===== Creating ${userKey} =====`);
      
      // Generate new user account
      const newUserWallet = xrpl.Wallet.generate();
      console.log(`${userKey} address: ${newUserWallet.address}`);
      
      // Fund the account on testnet
      console.log(`Funding ${userKey} account on testnet (this may take a moment)...`);
      const newUserFunded = await client.fundWallet(newUserWallet);
      console.log(`${userKey} account funded with ${newUserFunded.balance} XRP`);

      // Add the new user to the account info
      accountInfo[userKey] = {
        address: newUserWallet.address,
        seed: newUserWallet.seed,
        publicKey: newUserWallet.publicKey,
        privateKey: newUserWallet.privateKey,
        xrpBalance: newUserFunded.balance
      };

      // Create a trust line from new user to issuer
      console.log(`Creating trust line for ${userKey}...`);
      const newUserTrustlineTx = {
        TransactionType: 'TrustSet',
        Account: newUserWallet.address,
        LimitAmount: {
          currency: accountInfo.tokenInfo.currency,
          issuer: accountInfo.issuer.address,
          value: trustLineLimit.toString()
        }
      };
      
      const newUserTrustlineResult = await client.submitAndWait(newUserTrustlineTx, {
        wallet: newUserWallet
      });
      console.log(`${userKey} trustline created:`, newUserTrustlineResult.result.meta.TransactionResult);

      // Transfer tokens from distributor to new user
      console.log(`Transferring ${initialTokenAmount} UNO tokens to ${userKey}...`);
      const transferTokensTx = {
        TransactionType: 'Payment',
        Account: distributorWallet.address,
        Destination: newUserWallet.address,
        Amount: {
          currency: accountInfo.tokenInfo.currency,
          value: initialTokenAmount.toString(),
          issuer: accountInfo.issuer.address
        }
      };
      
      const transferTokensResult = await client.submitAndWait(transferTokensTx, {
        wallet: distributorWallet
      });
      console.log(`UNO tokens transferred to ${userKey}:`, transferTokensResult.result.meta.TransactionResult);

      // Check the balances of the new user
      const newUserBalances = await client.request({
        command: 'account_lines',
        account: newUserWallet.address,
        ledger_index: 'validated'
      });
      console.log(`${userKey} token balances:`, JSON.stringify(newUserBalances.result.lines, null, 2));
    }

    // Save all updated information back to the JSON file
    fs.writeFileSync('xrpl_accounts.json', JSON.stringify(accountInfo, null, 2));
    console.log("\nAccount information updated in xrpl_accounts.json");

  } catch (error) {
    console.error("Error:", error);
  }

  // Disconnect when done
  await client.disconnect();
  console.log("Disconnected from XRPL");
}

// Check if this script is being run directly
if (require.main === module) {
  // Get command line arguments
  const args = process.argv.slice(2);
  const userCount = args[0] ? parseInt(args[0]) : 1;
  const tokenAmount = args[1] ? parseInt(args[1]) : 500;
  const trustLimit = args[2] ? parseInt(args[2]) : 25000;
  
  console.log(`Adding ${userCount} new users with ${tokenAmount} tokens each and a trust limit of ${trustLimit}`);
  addUsers(userCount, tokenAmount, trustLimit);
}

module.exports = { addUsers };