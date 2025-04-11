// create_issuer.js
const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuer_wallet = (await client.fundWallet()).wallet

  const issuerDetails = {
    address: issuer_wallet.address,
    secret: issuer_wallet.seed
  }

  fs.writeFileSync("issuer_wallet.json", JSON.stringify(issuerDetails, null, 2))
  console.log("✅ Issuer wallet created and saved to issuer_wallet.json")

  client.disconnect()
}

main()
