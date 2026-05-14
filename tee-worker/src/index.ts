import { DstackClient } from '@phala/dstack-sdk'
import { toViemAccountSecure } from '@phala/dstack-sdk/viem'

const MANTLE_MAINNET = {
  chainId: 5000,
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272',
} as const

const AGENT_SALT = process.env.AGENT_SALT ?? 'mbg-scoring-agent-v0'

async function main() {
  console.log('MBG tee-worker hello')
  console.log('--------------------')
  console.log(`agent salt: ${AGENT_SALT}`)
  console.log(`target chain: Mantle Mainnet (${MANTLE_MAINNET.chainId})`)
  console.log(`identity registry: ${MANTLE_MAINNET.identityRegistry}`)
  console.log()

  let client: DstackClient
  let info
  try {
    client = new DstackClient()
    info = await client.info()
  } catch (err) {
    console.log('dstack unreachable. running outside a TEE or simulator.')
    console.log('this is expected for local development. deploy to Phala Cloud or run the dstack simulator (https://github.com/Dstack-TEE/dstack/tree/master/sdk/simulator) to exercise the full flow.')
    console.log()
    console.log(`reason: ${(err as Error).message}`)
    return
  }

  console.log('dstack reachable. enclave context:')
  console.log(`  app_id:      ${info.app_id}`)
  console.log(`  instance_id: ${info.instance_id}`)
  console.log(`  app_name:    ${info.app_name}`)
  console.log(`  device_id:   ${info.device_id}`)
  console.log()

  const keyResponse = await client.getKey(AGENT_SALT)
  const account = toViemAccountSecure(keyResponse)
  console.log(`derived signer address: ${account.address}`)
  console.log()

  const reportData = `mbg-hello-${Date.now()}`
  const quote = await client.getQuote(reportData)
  console.log(`tdx quote (truncated): ${quote.quote.slice(0, 66)}...`)
  console.log(`rtmrs: ${quote.replayRtmrs().join(', ')}`)
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})
