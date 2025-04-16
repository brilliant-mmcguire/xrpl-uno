// create-accounts.js - Creates and funds XRPL accounts, then saves them to a JSON file
const xrpl = require('xrpl');
const fs = require('fs');

async function createAndFundAccounts() {
  console.log("Connecting to XRPL Testnet...");
  
  // Connect to the XRPL Testnet
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log("Connected to XRPL Testnet");

  try {
    // Generate accounts
    const issuerWallet = xrpl.Wallet.generate();
    console.log("Issuer address:", issuerWallet.address);
    
    const distributorWallet = xrpl.Wallet.generate();
    console.log("Distributor address:", distributorWallet.address);
    
    const userWallet = xrpl.Wallet.generate();
    console.log("User address:", userWallet.address);

    // Fund accounts on testnet
    const issuerFunded = await client.fundWallet(issuerWallet);
    const distributorFunded = await client.fundWallet(distributorWallet);
    const userFunded = await client.fundWallet(userWallet);
    
    console.log("All accounts funded on testnet");

    // Prepare account information for saving
    const accountInfo = {
      issuer: {
        address: issuerWallet.address,
        seed: issuerWallet.seed,
        publicKey: issuerWallet.publicKey,
        privateKey: issuerWallet.privateKey,
        xrpBalance: issuerFunded.balance
      },
      distributor: {
        address: distributorWallet.address,
        seed: distributorWallet.seed,
        publicKey: distributorWallet.publicKey,
        privateKey: distributorWallet.privateKey,
        xrpBalance: distributorFunded.balance
      },
      user: {
        address: userWallet.address,
        seed: userWallet.seed,
        publicKey: userWallet.publicKey,
        privateKey: userWallet.privateKey,
        xrpBalance: userFunded.balance
      },
      tokenInfo: {
        currency: "UNO",
        description: "Commodity-backed stablecoin on XRPL"
      }
    };

    // Save to JSON file
    fs.writeFileSync('xrpl_accounts.json', JSON.stringify(accountInfo, null, 2));
    console.log("Account information saved to xrpl_accounts.json");

  } catch (error) {
    console.error("Error:", error);
  }

  // Disconnect when done
  await client.disconnect();
  console.log("Disconnected from XRPL");
}

createAndFundAccounts();