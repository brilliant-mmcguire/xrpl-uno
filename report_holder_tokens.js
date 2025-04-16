const xrpl = require("xrpl")
const fs = require("fs")

async function getTokenBalances(address, client) {
  const response = await client.request({
    command: "account_lines",
    account: address
  })

  const lines = response.result.lines
  return lines.map(line => ({
    currency: line.currency,
    issuer: line.account,
    balance: line.balance
  }))
}

async function main() {
  const holders = JSON.parse(fs.readFileSync("holders.json", "utf8"))
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  console.log("📊 Token Balances for All Holders:\n")

  console.log(holders)

  for (const [key, holder] of Object.entries(holders)) {
    console.log(`🔹 ${key} (${holder.address})`)
    const balances = await getTokenBalances(holder.address, client)

    if (balances.length === 0) {
      console.log("  ⚠️ No trust lines or token balances.\n")
    } else {
      for (const token of balances) {
        console.log(
          `  🪙 ${token.currency.padEnd(6)} | Balance: ${token.balance.padEnd(10)} | Issuer: ${token.issuer}`
        )
      }
      console.log()
    }
  }

  await client.disconnect()
}

main()

