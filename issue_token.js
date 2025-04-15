// transfer_token.js
const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  // Load saved wallets
  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holderData = JSON.parse(fs.readFileSync("holder_wallet.json"))

  const issuer_wallet = xrpl.Wallet.fromSeed(issuerData.secret)
  const holder_wallet = xrpl.Wallet.fromSeed(holderData.secret)

  const currency_code = "UNO"
  const amount = "100" // Change this value to send a different amount


  // Step 1: Check if trust line already exists
  const accountLines = await client.request({
    command: "account_lines",
    account: holder_wallet.address
  })

  const hasTrustLine = accountLines.result.lines.some(line =>
    line.currency === currency_code && line.account === issuer_wallet.address
  )

  if (!hasTrustLine) {
    console.log("🛠 Setting trust line for UNO...")
    const trust_tx = {
      TransactionType: "TrustSet",
      Account: holder_wallet.address,
      LimitAmount: {
        currency: currency_code,
        issuer: issuer_wallet.address,
        value: "1000"
      }
    }

    const ts_prepared = await client.autofill(trust_tx)
    const ts_signed = holder_wallet.sign(ts_prepared)
    await client.submitAndWait(ts_signed.tx_blob)
    console.log("✅ Trust line established")
  }

  // Step 2: Send UNO tokens from issuer to holder
  const payment_tx = {
    TransactionType: "Payment",
    Account: issuer_wallet.address,
    Destination: holder_wallet.address,
    Amount: {
      currency: currency_code,
      value: amount,
      issuer: issuer_wallet.address
    }
  }

  const payment_prepared = await client.autofill(payment_tx)
  const payment_signed = issuer_wallet.sign(payment_prepared)
  await client.submitAndWait(payment_signed.tx_blob)

  console.log(`✅ Transferred ${amount} UNO to holder ${holder_wallet.address}`)

  // Step 3: Display balance
  const updatedLines = await client.request({
    command: "account_lines",
    account: holder_wallet.address
  })

  const unoLine = updatedLines.result.lines.find(line => line.currency === currency_code)
  if (unoLine) {
    console.log(`🔎 Holder balance: ${unoLine.balance} ${unoLine.currency}`)
  }

  client.disconnect()
}

main()
