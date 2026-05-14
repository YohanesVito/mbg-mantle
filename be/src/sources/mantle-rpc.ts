import {createPublicClient, http, type PublicClient} from 'viem'
import {mantle} from 'viem/chains'

export const MANTLE_RPC_URL = process.env.MANTLE_RPC_URL ?? 'https://rpc.mantle.xyz'

export const mantleClient: PublicClient = createPublicClient({
  chain: mantle,
  transport: http(MANTLE_RPC_URL),
})
