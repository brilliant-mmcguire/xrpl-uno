const xrpl = require("xrpl")
const fs = require("fs")

async function main() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
  await client.connect()

  const issuerData = JSON.parse(fs.readFileSync("issuer_wallet.json"))
  const response = await client.request({
    command: "account_info",
    account: issuerData.address
  })

  const xrpBalance = xrpl.dropsToXrp(response.result.account_data.Balance)
  console.log(`Issuer XRP balance: ${xrpBalance} XRP`)

  await client.disconnect()
}

main()
