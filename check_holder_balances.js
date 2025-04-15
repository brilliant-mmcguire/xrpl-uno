const xrpl = require("xrpl")
const fs = require("fs")

async function getTrustLineBalance(client, holderAddress, issuerAddress, tokenName) {
  const response = await client.request({
    command: "account_lines",
    account: holderAddress
  })

  const line = response.result.lines.find(
    l => l.currency === tokenName && l.account === issuerAddress
  )

  return line ? parseFloat(line.balance) : 0
}

async function getXRPBalance(client, address) {
  const response = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated"
  })
  return xrpl.dropsToXrp(response.result.account_data.Balance)
}

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const holders = JSON.parse(fs.readFileSync("holders.json"))

  const issuerAddress = issuerData.address
  const tokenName = "UNO"
  
  console.log(`\n📋 ${tokenName} Balances for All Holders:\n`)

  for (const [key, holder] of Object.entries(holders)) {
    const tokenBalance = await getTrustLineBalance(client, holder.address, issuerAddress, tokenName)
    const xrpBalance = await getXRPBalance(client, holder.address)

    console.log(`👤 ${key} (${holder.address})`)
    console.log(`   💰 ${tokenName}: ${tokenBalance}`)
    console.log(`   ⚡ XRP: ${xrpBalance}`)
  }

  await client.disconnect()
}

main()
