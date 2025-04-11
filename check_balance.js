// check_balance.js
const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  // Load issuer and holder info
  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holderData = JSON.parse(fs.readFileSync("holder_wallet.json"))

  const currency_code = "UNO"

  // Request trust lines (balances) for the holder
  const result = await client.request({
    command: "account_lines",
    account: holderData.address
  })

  // Find balance line for the token
  const line = result.result.lines.find(l =>
    l.currency === currency_code && l.account === issuerData.address
  )

  if (line) {
    console.log(`🔎 Holder has ${line.balance} ${line.currency} issued by ${line.account}`)
  } else {
    console.log("⚠️ No balance or trust line found for UNO token.")
  }

  client.disconnect()
}

main()
