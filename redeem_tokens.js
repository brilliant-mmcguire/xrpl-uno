// burn_tokens.js
const xrpl = require("xrpl")
const fs = require("fs")

function stringToCurrencyHex(str) {
  const hex = Buffer.from(str).toString("hex").toUpperCase()
  return hex.padEnd(40, "0")
}

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  // Load issuer and holder wallet details
  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holderData = JSON.parse(fs.readFileSync("holder_wallet.json"))

  const issuer_wallet = xrpl.Wallet.fromSeed(issuerData.secret)
  const holder_wallet = xrpl.Wallet.fromSeed(holderData.secret)

  const currency_code = "UNO"
  const burn_amount = "50"  // 🔥 Amount of tokens to burn

  // Send tokens *back* to the issuer (the burn)
  const burn_tx = {
    TransactionType: "Payment",
    Account: holder_wallet.address,
    Destination: issuer_wallet.address,
    Amount: {
      currency: currency_code,
      issuer: issuer_wallet.address,
      value: burn_amount
    }
  }

  const prepared = await client.autofill(burn_tx)
  const signed = holder_wallet.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)

  if (result.result.meta.TransactionResult === "tesSUCCESS") {
    console.log(`🔥 Burned ${burn_amount} UNO by sending back to issuer`)
  } else {
    console.log("❌ Burn failed:", result.result.meta.TransactionResult)
  }

  // Check new balance
  const lines = await client.request({
    command: "account_lines",
    account: holder_wallet.address
  })

  const unoLine = lines.result.lines.find(line =>
    line.currency === currency_code && line.account === issuer_wallet.address
  )

  if (unoLine) {
    console.log(`🔎 New balance: ${unoLine.balance} ${unoLine.currency}`)
  }

  client.disconnect()
}

main()
