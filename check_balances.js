const xrpl = require("xrpl")
const fs = require("fs")


async function getAccountInfo(client, address) {
  const { result } = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated"
  })
  return result.account_data
}

async function getTrustLines(client, address) {
  const { result } = await client.request({
    command: "account_lines",
    account: address
  })
  return result.lines
}

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuer = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holders = JSON.parse(fs.readFileSync("holders.json"))

  const tokenName = "UNO"

  console.log(`\n📋 XRPL Combined Balance Report — Token: ${tokenName}\n`)

  // Issuer XRP balance
  const issuerInfo = await getAccountInfo(client, issuer.address)
  const issuerXRP = xrpl.dropsToXrp(issuerInfo.Balance)
  console.log(`🏦 Issuer (${issuer.address})`)
  console.log(`   💰 XRP Balance: ${issuerXRP}`)
  console.log(`   🔐 Reserved: 10 XRP (account reserve)\n`)

  // Holders
  for (const [key, holder] of Object.entries(holders)) {
    const acctInfo = await getAccountInfo(client, holder.address)
    const trustLines = await getTrustLines(client, holder.address)
    const tokenLine = trustLines.find(
      l => l.currency === tokenName && l.account === issuer.address
    )

    const xrpBalance = parseFloat(xrpl.dropsToXrp(acctInfo.Balance))
    const trustLineCount = trustLines.length
    const tokenBalance = tokenLine ? tokenLine.balance : "0"

    const reserved = 10 + (2 * trustLineCount)
    const available = xrpBalance - reserved

    console.log(`👤 ${key} (${holder.address})`)
    console.log(`   💰 XRP Balance: ${xrpBalance}`)
    console.log(`   🔐 Reserved: ${reserved} XRP (${10} account + ${2 * trustLineCount} for ${trustLineCount} trust line(s))`)
    console.log(`   💸 Available XRP: ${available < 0 ? 0 : available.toFixed(6)} XRP`)
    console.log(`   🪙 ${tokenName} Balance: ${tokenBalance}`)
    console.log("")
  }

  await client.disconnect()
}

main()
