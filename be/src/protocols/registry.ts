import type { Protocol } from '../types'

export const PROTOCOLS: Protocol[] = [
  {
    id: 'aave-v3-mantle',
    name: 'Aave V3',
    slug: 'aave-v3',
    category: 'lending',
    description: 'Aave V3 deployment on Mantle (launched 2026-02; reached $290M TVL in 12 days)',
    deployedAt: '2026-02-26',
    oraclePattern: 'aave-v3',
    addresses: {
      aaveOracle: '0x47a063CfDa980532267970d478EC340C0F80E8df',
      poolDataProvider: '0x487c5c669D9eee6057C44973207101276cf73b68',
    },
    audits: [
      { firm: 'OpenZeppelin', date: '2022-01-27', url: 'https://github.com/aave/aave-v3-core/tree/master/audits' },
      { firm: 'Trail of Bits', date: '2022-02-15' },
      { firm: 'ABDK', date: '2022-03-01' },
      { firm: 'SigmaPrime', date: '2022-04-01' },
      { firm: 'Peckshield', date: '2022-05-01' },
    ],
  },
  {
    id: 'lendle',
    name: 'Lendle',
    slug: 'lendle-pooled-markets',
    category: 'lending',
    description:
      'Aave V2 fork on Mantle. DefiLlama splits the product into pooled-markets, isolated-markets, yield, and earn — we use pooled-markets as the primary entity.',
    deployedAt: '2023-07-01',
    oraclePattern: 'aave-v2',
    addresses: {
      aaveOracle: '0x870c9692Ab04944C86ec6FEeF63F261226506EfC',
      poolDataProvider: '0x552b9e4bae485C4B7F540777d7D25614CdB84773',
    },
    audits: [
      {
        firm: 'SourceHat',
        date: '2023-09-01',
        url: 'https://sourcehat.com/audits/Lendle/',
      },
      { firm: 'Halborn', date: '2023-10-01', url: 'https://www.halborn.com/audits' },
    ],
  },
  {
    id: 'init-capital',
    name: 'Init Capital',
    slug: 'init-capital',
    category: 'lending',
    description: 'Lending protocol with isolated markets and hooks',
    deployedAt: '2024-02-01',
    audits: [
      {
        firm: 'Code4rena',
        date: '2024-01-15',
        url: 'https://code4rena.com/audits/2023-12-init-capital-invitational',
        findings: { critical: 0, high: 3, medium: 4 },
      },
      { firm: 'PeckShield', date: '2024-01-20' },
      { firm: 'Trust Security', date: '2024-01-25' },
    ],
  },
  {
    id: 'meth-protocol',
    name: 'mETH Protocol',
    slug: 'meth-protocol',
    category: 'lst',
    description:
      'Mantle Liquid Staking Protocol (mETH + cmETH). Staking happens on Ethereum so DefiLlama registers chains as ["Ethereum"]; we use protocol-wide TVL.',
    deployedAt: '2023-12-01',
    tvlMetric: 'total',
    audits: [
      {
        firm: 'OpenZeppelin',
        date: '2024-01-01',
        url: 'https://www.openzeppelin.com/news/mantle-op-geth-audit',
        scope: 'op-geth',
      },
    ],
  },
  {
    id: 'merchant-moe',
    name: 'Merchant Moe',
    slug: 'merchant-moe-liquidity-book',
    category: 'dex',
    description: 'Liquidity Book DEX on Mantle (Trader Joe v2.1 architecture).',
    deployedAt: '2023-12-01',
    audits: [{ firm: 'Inherited from Trader Joe v2.1', date: '2023-04-01' }],
  },
  {
    id: 'agni-finance',
    name: 'Agni Finance',
    slug: 'agni-finance',
    category: 'dex',
    description: 'Concentrated-liquidity DEX on Mantle (Uniswap V3 architecture).',
    deployedAt: '2023-07-21',
    audits: [], // TODO: verify auditors via https://agni.finance/ docs
  },
  {
    id: 'fusionx-v3',
    name: 'FusionX V3',
    slug: 'fusionx-v3',
    category: 'dex',
    description: 'Concentrated-liquidity DEX on Mantle. V3 successor to FusionX V2.',
    deployedAt: '2023-07-17',
    audits: [
      {
        firm: 'PeckShield',
        date: '2023-07-01',
        url: 'https://github.com/dr-fusion/fusionx-audits/blob/main/PeckShield-Audit-Report-FusionX-v1.0.pdf',
      },
    ],
  },
  {
    id: 'ktx-perps',
    name: 'KTX Perps',
    slug: 'ktx-perps',
    category: 'derivatives',
    description: 'Perpetual futures on Mantle (also deployed on Arbitrum, BSC).',
    deployedAt: '2023-05-25',
    audits: [
      {
        firm: 'MetaScan',
        date: '2023-05-25',
        url: 'https://ktx-public-assets.s3.ap-southeast-1.amazonaws.com/MetaScan_Report_KTX_Finance.pdf',
      },
    ],
  },
  {
    id: 'treehouse',
    name: 'Treehouse Protocol',
    slug: 'treehouse-protocol',
    category: 'lst',
    description:
      'Yield-bearing tAssets (tETH, etc.) and DOR (Decentralized Offered Rate). Deployed across Ethereum, Avalanche, Mantle.',
    deployedAt: '2024-09-10',
    tvlMetric: 'total',
    audits: [
      {
        firm: 'Treehouse audit reports (multi-firm)',
        date: '2024-09-01',
        url: 'https://github.com/treehouse-gaia/audit-report',
      },
    ],
  },
  {
    id: 'ondo-usdy',
    name: 'Ondo USDY',
    slug: 'ondo-yield-assets',
    category: 'rwa',
    description:
      'Tokenized short-term US Treasuries (USDY). Deployed across 12 chains including Mantle.',
    deployedAt: '2024-01-01',
    audits: [
      {
        firm: 'CertiK',
        date: '2024-01-01',
        url: 'https://www.certik.org/projects/ondofinance',
      },
    ],
  },
  {
    id: 'mi4',
    name: 'Mantle Index Four Fund',
    slug: 'mantle-index-four-fund',
    category: 'rwa',
    description:
      'Tokenized basket of BTC/ETH/SOL/stables. Structured as a BVI Limited Partnership; managed by Mantle Guard Limited; tokenization by Securitize; custody via Fireblocks; legal counsel Latham & Watkins. No public smart-contract audit report surfaced; institutional fund-audit chain (Big 4 pattern) not disclosed publicly.',
    deployedAt: '2025-10-24',
    audits: [], // TODO: contact Securitize / Mantle Guard for public-disclosable audit references
  },
  {
    id: 'function-fbtc',
    name: 'Function FBTC',
    slug: 'function-fbtc',
    category: 'bridge',
    description:
      'Function (FBTC): tokenized BTC across EVM ecosystems. Backed by Galaxy Digital + Antalpha + Mantle ($10M seed, Jul 2025). Documentation references audited reserves; specific smart-contract audit report not located via public search. DefiLlama registers chains as Bitcoin.',
    deployedAt: '2024-08-05',
    tvlMetric: 'total',
    audits: [], // TODO: obtain Hacken / Quantstamp / equivalent audit URLs from Function team
  },
  {
    id: 'ethena-usde',
    name: 'Ethena USDe',
    slug: 'ethena-usde',
    category: 'stablecoin',
    description:
      'Synthetic USD stablecoin backed by ETH delta-neutral basis trade. DefiLlama-registered chains: Ethereum; used on Mantle as a stable asset.',
    deployedAt: '2024-02-15',
    tvlMetric: 'total',
    audits: [
      {
        firm: 'Quantstamp + others',
        date: '2024-02-01',
        url: 'https://ethena-labs.gitbook.io/ethena-labs/resources/audits',
      },
    ],
  },
]

export function findProtocol(query: string): Protocol | undefined {
  const q = query.toLowerCase()
  return PROTOCOLS.find(
    (p) => p.id.toLowerCase() === q || p.slug.toLowerCase() === q || p.name.toLowerCase() === q,
  )
}
