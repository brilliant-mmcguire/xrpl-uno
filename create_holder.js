const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const newWallet = (await client.fundWallet()).wallet
  const newHolder = {
    address: newWallet.address,
    secret: newWallet.seed
  }

  const holdersFile = "holders.json"
  let holders = {}
  let holderIndex = 1

  if (fs.existsSync(holdersFile)) {
    holders = JSON.parse(fs.readFileSync(holdersFile))
    const existingKeys = Object.keys(holders)
    const indexes = existingKeys.map(k => parseInt(k.replace("holder", ""), 10)).filter(n => !isNaN(n))
    holderIndex = Math.max(...indexes, 0) + 1
  }

  const holderKey = `holder${holderIndex}`
  holders[holderKey] = newHolder

  fs.writeFileSync(holdersFile, JSON.stringify(holders, null, 2))

  console.log(`✅ Created ${holderKey}:`)
  console.log(newHolder)

  client.disconnect()
}

main()
