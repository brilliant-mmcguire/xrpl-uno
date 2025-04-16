// check-balances.js - Checks XRP and token balances of all accounts
const xrpl = require('xrpl');
const fs = require('fs');

async function checkBalances() {
  // Load account information from JSON file
  if (!fs.existsSync('xrpl_accounts.json')) {
    console.error("Error: xrpl_accounts.json file not found.");
    return;
  }

  const accountFile = fs.readFileSync('xrpl_accounts.json');
  const accountInfo = JSON.parse(accountFile);
  
  console.log("Loaded account information from xrpl_accounts.json");
  console.log(`Token currency: ${accountInfo.tokenInfo.currency}`);

  // Connect to XRPL Testnet
  console.log("Connecting to XRPL Testnet...");
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log("Connected to XRPL Testnet");

  try {
    // Get all account types (excluding tokenInfo)
    const accountTypes = Object.keys(accountInfo).filter(key => key !== 'tokenInfo');
    
    // Track total tokens in circulation
    let totalTokensIssued = 0;
    let userTokenBalances = {};
    
    // Check each account
    for (const accountType of accountTypes) {
      const address = accountInfo[accountType].address;
      console.log(`\n========= ${accountType.toUpperCase()} ACCOUNT =========`);
      console.log(`Address: ${address}`);
      
      // Get XRP balance
      const accountData = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      
      // Convert drops to XRP (1 XRP = 1,000,000 drops)
      const xrpBalance = accountData.result.account_data.Balance / 1000000;
      console.log(`XRP Balance: ${xrpBalance} XRP`);
      
      // Get issued currencies balances (trust lines)
      const trustLines = await client.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated'
      });
      
      if (trustLines.result.lines && trustLines.result.lines.length > 0) {
        console.log("Token Balances:");
        trustLines.result.lines.forEach(line => {
          console.log(`  ${line.currency}: ${line.balance} (Issuer: ${line.account})`);
          
          // Track token balances for user accounts
          if (accountType.startsWith('user') && line.currency === accountInfo.tokenInfo.currency) {
            userTokenBalances[accountType] = parseFloat(line.balance);
          }
          
          if (line.limit) {
            console.log(`  Trust Limit: ${line.limit}`);
          }
          if (line.limit_peer) {
            console.log(`  Issuer Trust Limit: ${line.limit_peer}`);
          }
        });
      } else {
        console.log("No token balances found");
      }
      
      // If this is the issuer account, get its settings
      if (accountType === 'issuer') {
        try {
          const accountSettings = await client.request({
            command: 'account_info',
            account: address,
            ledger_index: 'validated',
            signer_lists: true
          });
          
          // Check for transfer rate (fee)
          const flags = accountSettings.result.account_data.Flags;
          console.log("\nAccount Flags:", flags);
          
          // Check if DefaultRipple is enabled (flag 8)
          const defaultRipple = (flags & 8) === 8;
          console.log("Default Ripple Enabled:", defaultRipple);
          
          // Check transfer rate if it exists
          if (accountSettings.result.account_data.TransferRate) {
            const transferRate = (accountSettings.result.account_data.TransferRate - 1000000000) / 10000000;
            console.log(`Transfer Fee: ${transferRate}%`);
          } else {
            console.log("Transfer Fee: Not set");
          }
        } catch (error) {
          console.log("Could not fetch issuer settings:", error.message);
        }
      }
    }
    
    // Check for token obligations (total issuances)
    console.log("\n========= TOKEN STATISTICS =========");
    try {
      // Create an array of hot wallets (all non-issuer accounts)
      const hotWallets = accountTypes
        .filter(type => type !== 'issuer')
        .map(type => accountInfo[type].address);
      
      const gatewayBalances = await client.request({
        command: 'gateway_balances',
        account: accountInfo.issuer.address,
        ledger_index: 'validated',
        hotwallet: hotWallets
      });
      
      if (gatewayBalances.result.obligations) {
        console.log("Total Tokens Issued:");
        for (const [currency, amount] of Object.entries(gatewayBalances.result.obligations)) {
          console.log(`  ${currency}: ${amount}`);
          if (currency === accountInfo.tokenInfo.currency) {
            totalTokensIssued = parseFloat(amount);
          }
        }
      } else {
        console.log("No obligations found");
      }
      
      if (gatewayBalances.result.balances) {
        console.log("\nHot Wallet Balances:");
        for (const [wallet, balances] of Object.entries(gatewayBalances.result.balances)) {
          // Find the account type for this wallet address
          const accountType = accountTypes.find(type => accountInfo[type].address === wallet) || 'Unknown';
          console.log(`  ${accountType} (${wallet}):`);
          balances.forEach(balance => {
            console.log(`    ${balance.currency}: ${balance.value}`);
          });
        }
      }
      
      // Calculate total tokens held by users
      const userAccounts = accountTypes.filter(type => type.startsWith('user'));
      if (userAccounts.length > 0) {
        console.log("\nUser Token Summary:");
        let totalUserTokens = 0;
        
        for (const userType of Object.keys(userTokenBalances)) {
          console.log(`  ${userType}: ${userTokenBalances[userType]} ${accountInfo.tokenInfo.currency}`);
          totalUserTokens += userTokenBalances[userType];
        }
        
        console.log(`\nTotal User Holdings: ${totalUserTokens} ${accountInfo.tokenInfo.currency}`);
        const distributorBalance = totalTokensIssued - totalUserTokens;
        console.log(`Distributor Balance: ${distributorBalance} ${accountInfo.tokenInfo.currency}`);
        console.log(`Total Distribution: ${(totalUserTokens / totalTokensIssued * 100).toFixed(2)}% of supply`);
      }
      
    } catch (error) {
      console.log("Could not fetch gateway balances:", error.message);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }

  // Disconnect when done
  await client.disconnect();
  console.log("\nDisconnected from XRPL");
}

// Check if this script is being run directly
if (require.main === module) {
  checkBalances();
}

module.exports = { checkBalances };