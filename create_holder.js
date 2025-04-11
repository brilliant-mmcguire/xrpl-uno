// create_holder.js
const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const holder_wallet = (await client.fundWallet()).wallet

  const holderDetails = {
    address: holder_wallet.address,
    secret: holder_wallet.seed
  }

  fs.writeFileSync("holder_wallet.json", JSON.stringify(holderDetails, null, 2))
  console.log("✅ Holder wallet created and saved to holder_wallet.json")

  client.disconnect()
}

main()
