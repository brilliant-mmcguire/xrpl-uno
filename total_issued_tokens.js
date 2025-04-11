// total_issued_tokens.js
const xrpl = require("xrpl")
const fs = require("fs")


async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const tokenName = "UNO"

  console.log(`\n🔍 Checking total issued tokens for: ${tokenName}\n`)

  let marker = null
  let totalIssued = 0
  let allHolders = []

  do {
    const response = await client.request({
      command: "account_lines",
      account: issuerData.address,
      marker: marker || undefined
    })

    const lines = response.result.lines
    marker = response.result.marker

    // Sum balances where issuer owes the token (i.e., holder has positive balance)
    for (const line of lines) {
      if (line.currency === tokenName && parseFloat(line.balance) < 0) {
        const issued = Math.abs(parseFloat(line.balance))
        totalIssued += issued
        allHolders.push({ address: line.account, amount: issued })
      }
    }

  } while (marker)

  if (allHolders.length === 0) {
    console.log("⚠️ No issued tokens found.")
  } else {
    allHolders.forEach(h =>
      console.log(`💼 ${h.address} holds ${h.amount} ${tokenName}`)
    )
    console.log(`\n🔢 Total ${tokenName} issued: ${totalIssued.toFixed(6)}\n`)
  }

  await client.disconnect()
}

main()
