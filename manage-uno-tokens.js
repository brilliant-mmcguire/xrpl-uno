// manage-uno-tokens.js - Loads accounts from JSON file, issues and transfers UNO tokens
const xrpl = require('xrpl');
const fs = require('fs');

async function manageUnoTokens() {
  // Load account information from JSON file
  const accountFile = fs.readFileSync('xrpl_accounts.json');
  const accountInfo = JSON.parse(accountFile);
  
  console.log("Loaded account information from xrpl_accounts.json");
  console.log(`Token currency: ${accountInfo.tokenInfo.currency}`);

  // Create wallet instances from the loaded information
  const issuerWallet = xrpl.Wallet.fromSeed(accountInfo.issuer.seed);
  const distributorWallet = xrpl.Wallet.fromSeed(accountInfo.distributor.seed);
  const userWallet = xrpl.Wallet.fromSeed(accountInfo.user.seed);

  console.log("Connecting to XRPL Testnet...");
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log("Connected to XRPL Testnet");

  try {
    // Step 1: Configure issuer account settings
    // Use direct numeric value for asfDefaultRipple (8)
    console.log("Configuring issuer account settings...");
    const issuerSettingsTx = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      SetFlag: 8  // Direct value for asfDefaultRipple instead of using constant
    };
    
    const issuerSettingsResult = await client.submitAndWait(issuerSettingsTx, {
      wallet: issuerWallet
    });
    console.log("Issuer settings configured:", issuerSettingsResult.result.meta.TransactionResult);

    // Step 2: Create a trust line from distributor to issuer
    console.log("Creating distributor trust line...");
    const distributorTrustlineTx = {
      TransactionType: 'TrustSet',
      Account: distributorWallet.address,
      LimitAmount: {
        currency: accountInfo.tokenInfo.currency,
        issuer: issuerWallet.address,
        value: '1000000' // Maximum amount the distributor is willing to hold
      }
    };
    
    const distributorTrustlineResult = await client.submitAndWait(distributorTrustlineTx, {
      wallet: distributorWallet
    });
    console.log("Distributor trustline created:", distributorTrustlineResult.result.meta.TransactionResult);

    // Step 3: Issue UNO tokens from issuer to distributor
    console.log("Issuing tokens to distributor...");
    const issueTokensTx = {
      TransactionType: 'Payment',
      Account: issuerWallet.address,
      Destination: distributorWallet.address,
      Amount: {
        currency: accountInfo.tokenInfo.currency,
        value: '100000', // Issuing 100,000 UNO tokens
        issuer: issuerWallet.address
      }
    };
    
    const issueTokensResult = await client.submitAndWait(issueTokensTx, {
      wallet: issuerWallet
    });
    console.log("UNO tokens issued to distributor:", issueTokensResult.result.meta.TransactionResult);

    // Step 4: Create a trust line from user to issuer
    console.log("Creating user trust line...");
    const userTrustlineTx = {
      TransactionType: 'TrustSet',
      Account: userWallet.address,
      LimitAmount: {
        currency: accountInfo.tokenInfo.currency,
        issuer: issuerWallet.address,
        value: '50000' // Maximum amount the user is willing to hold
      }
    };
    
    const userTrustlineResult = await client.submitAndWait(userTrustlineTx, {
      wallet: userWallet
    });
    console.log("User trustline created:", userTrustlineResult.result.meta.TransactionResult);

    // Step 5: Transfer UNO tokens from distributor to user
    console.log("Transferring tokens to user...");
    const transferTokensTx = {
      TransactionType: 'Payment',
      Account: distributorWallet.address,
      Destination: userWallet.address,
      Amount: {
        currency: accountInfo.tokenInfo.currency,
        value: '1000', // Transferring 1,000 UNO tokens
        issuer: issuerWallet.address
      }
    };
    
    const transferTokensResult = await client.submitAndWait(transferTokensTx, {
      wallet: distributorWallet
    });
    console.log("UNO tokens transferred to user:", transferTokensResult.result.meta.TransactionResult);

    // Step 6: Check balances
    console.log("Checking balances...");
    const distributorBalances = await client.request({
      command: 'account_lines',
      account: distributorWallet.address,
      ledger_index: 'validated'
    });
    console.log("Distributor balances:", JSON.stringify(distributorBalances.result.lines, null, 2));

    const userBalances = await client.request({
      command: 'account_lines',
      account: userWallet.address,
      ledger_index: 'validated'
    });
    console.log("User balances:", JSON.stringify(userBalances.result.lines, null, 2));

    // Step 7: Configure issuer transfer fee for ongoing management
    console.log("Setting transfer fee for commodity management...");
    const setTransferFeeTx = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      TransferRate: 1005000000 // 0.5% fee (1.000000 = 0% fee, 1.005000 = 0.5% fee)
    };
    
    const setTransferFeeResult = await client.submitAndWait(setTransferFeeTx, {
      wallet: issuerWallet
    });
    console.log("Transfer fee configured:", setTransferFeeResult.result.meta.TransactionResult);

  } catch (error) {
    console.error("Error:", error);
  }

  // Disconnect when done
  await client.disconnect();
  console.log("Disconnected from XRPL");
}

manageUnoTokens();