const xrpl = require("xrpl")
const fs = require("fs")

async function issueTokens(client, issuer_wallet, holder, tokenName, amount) {
  const holder_wallet = xrpl.Wallet.fromSeed(holder.secret)

  // Step 1: Create trust line if not already created
  const trustSetTx = {
    TransactionType: "TrustSet",
    Account: holder_wallet.address,
    LimitAmount: {
      currency: tokenName,
      issuer: issuer_wallet.address,
      value: "1000"
    }
  }

  try {
    const preparedTrust = await client.autofill(trustSetTx)
    const signedTrust = holder_wallet.sign(preparedTrust)
    await client.submitAndWait(signedTrust.tx_blob)
    console.log(`✅ Trust line created for ${holder_wallet.address}`)
  } catch (err) {
    if (err?.data?.error === "tecNO_LINE_INSUF_RESERVE") {
      console.error(`❌ Holder ${holder_wallet.address} has insufficient XRP for a trust line.`)
      return
    } else {
      console.warn(`⚠️  TrustSet may already exist for ${holder_wallet.address}`)
    }
  }

  // Step 2: Send payment
  const paymentTx = {
    TransactionType: "Payment",
    Account: issuer_wallet.address,
    Destination: holder_wallet.address,
    Amount: {
      currency: tokenName,
      issuer: issuer_wallet.address,
      value: amount.toString()
    }
  }

  const preparedPayment = await client.autofill(paymentTx)
  const signedPayment = issuer_wallet.sign(preparedPayment)
  await client.submitAndWait(signedPayment.tx_blob)

  console.log(`✅ Sent ${amount} tokens to ${holder_wallet.address}`)
}

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holders = JSON.parse(fs.readFileSync("holders.json"))

  const issuer_wallet = xrpl.Wallet.fromSeed(issuerData.secret)

  const tokenName = "UNO"
  const amountPerHolder = 100

  console.log(`\n🚀 Issuing ${amountPerHolder} ${tokenName} to all holders...\n`)

  for (const [key, holder] of Object.entries(holders)) {
    console.log(`➡️ Processing ${key} (${holder.address})`)
    await issueTokens(client, issuer_wallet, holder, tokenName, amountPerHolder)
  }

  console.log(`\n✅ Done issuing ${tokenName} to all holders.`)
  await client.disconnect()
}

main()
