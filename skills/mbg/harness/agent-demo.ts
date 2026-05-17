#!/usr/bin/env bun
/**
 * Minimal local agent harness for the MBG Skill.
 *
 * Demonstrates the same flow an OpenClaw / RealClaw agent would run, but
 * without needing the full agent framework — just Ollama running locally
 * and the `mbg-cli` binary in this repo.
 *
 * Flow:
 *   1. Load SKILL.md as system context
 *   2. Send user query to Ollama (default: qwen2.5-coder:3b)
 *   3. If the model outputs `$ mbg-cli ...` lines, execute them and feed
 *      output back; loop. Otherwise treat output as the final answer.
 *
 * Usage:
 *   bun run harness "I want to lend USDC on Mantle. What's safest?"
 *
 * Env:
 *   OLLAMA_URL   default http://127.0.0.1:11434
 *   OLLAMA_MODEL default qwen2.5-coder:3b
 *   MBG_RPC_URL / MBG_CHAIN_ID / MBG_ORACLE_ADDRESS — passed through to mbg-cli
 */

import {readFile} from 'node:fs/promises'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b'
const HERE = dirname(fileURLToPath(import.meta.url))
const SKILL_MD_PATH = join(HERE, '..', 'SKILL.md')
const MBG_CLI_PATH = join(HERE, '..', 'bin', 'mbg-cli.ts')

const MAX_TURNS = 8

function envForMbg(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    MBG_RPC_URL: process.env.MBG_RPC_URL ?? 'https://rpc.sepolia.mantle.xyz',
    MBG_CHAIN_ID: process.env.MBG_CHAIN_ID ?? '5003',
    MBG_ORACLE_ADDRESS:
      process.env.MBG_ORACLE_ADDRESS ?? '0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45',
  }
}

async function runMbgCli(argsLine: string): Promise<{stdout: string; stderr: string; ok: boolean}> {
  const args = parseShellArgs(argsLine)
  return new Promise((resolve) => {
    const child = spawn('bun', ['run', MBG_CLI_PATH, ...args], {
      env: envForMbg(),
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    child.on('close', (code: number | null) => {
      resolve({stdout: stdout.trim(), stderr: stderr.trim(), ok: code === 0})
    })
  })
}

/** Tiny shell-arg parser supporting double quotes and single quotes (so JSON works). */
function parseShellArgs(line: string): string[] {
  const tokens: string[] = []
  let cur = ''
  let q: '"' | "'" | null = null
  for (const c of line) {
    if (q) {
      if (c === q) {q = null; continue}
      cur += c
    } else if (c === '"' || c === "'") {
      q = c
    } else if (c === ' ' || c === '\t') {
      if (cur) tokens.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  if (cur) tokens.push(cur)
  return tokens
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chatTurn(messages: OllamaMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {temperature: 0.2},
    }),
  })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
  const data = (await res.json()) as {message: {content: string}}
  return data.message.content
}

function extractCommands(text: string): string[] {
  // Match anywhere a `$ mbg-cli ...` appears (line-start or after a label).
  // Tolerant of "A. $ mbg-cli ...", "1) $ mbg-cli ...", or just "$ mbg-cli ...".
  const re = /\$\s*(mbg-cli\s[^\n`]+)/g
  const out: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const cmd = m[1]!.trim().replace(/[`'"]+$/, '')
    if (!seen.has(cmd)) {
      seen.add(cmd)
      out.push(cmd)
    }
  }
  return out
}

function trimTail(s: string, max = 2000): string {
  if (s.length <= max) return s
  return s.slice(0, max) + `\n... (truncated, ${s.length - max} more chars)`
}

async function main() {
  const query = process.argv.slice(2).join(' ')
  if (!query) {
    console.error('Usage: bun run harness "<user query>"')
    process.exit(1)
  }

  const skillMd = await readFile(SKILL_MD_PATH, 'utf-8')

  const systemPrompt = `You are an AI agent helping a user with DeFi decisions on Mantle Network.

You have access to one Skill: MBG (Mantle Bot Gate). Below is its full manifest.

=== SKILL.md START ===
${skillMd}
=== SKILL.md END ===

PROTOCOL FOR THIS HARNESS

You output exactly one of two things per turn:

A. A SINGLE shell command on its own line, prefixed with "$ ".
   The harness will run it and show you the output in the next turn.
   Example: $ mbg-cli list-protocols -o json
   Always use -o json when fetching data so you can parse it.
   Do NOT include backticks, code fences, or explanation. Just the $-line.

B. A final answer for the user. No $-lines. Plain prose.

Pick A when you need more data. Pick B when you've gathered enough to answer.

REQUIRED in your final answer:
- Name the protocol(s) you're recommending.
- Quote the aggregate score AND the attestation traceHash from MBG output.
- Tell the user how they could verify on Mantlescan.

Now help with this user query: ${query}`

  const messages: OllamaMessage[] = [
    {role: 'system', content: systemPrompt},
    {role: 'user', content: query},
  ]

  console.log('━'.repeat(70))
  console.log(`Model:  ${OLLAMA_MODEL}`)
  console.log(`Skill:  mbg-score (loaded from ${SKILL_MD_PATH})`)
  console.log(`Query:  ${query}`)
  console.log('━'.repeat(70))

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    console.log()
    console.log(`── turn ${turn} ── (asking ${OLLAMA_MODEL})`)
    const reply = await chatTurn(messages)
    console.log()
    console.log(reply)

    const commands = extractCommands(reply)
    if (commands.length === 0) {
      console.log()
      console.log('━'.repeat(70))
      console.log('Agent gave final answer (no more commands). Done.')
      console.log('━'.repeat(70))
      return
    }

    // Append the model's turn to history
    messages.push({role: 'assistant', content: reply})

    // Run each command and prepare a user-role tool-output message
    const toolOutputs: string[] = []
    for (const cmd of commands) {
      // strip leading 'mbg-cli ' since we always run mbg-cli
      const argsLine = cmd.replace(/^mbg-cli\s+/, '')
      console.log()
      console.log(`→ executing: mbg-cli ${argsLine}`)
      const {stdout, stderr, ok} = await runMbgCli(argsLine)
      const out = stdout || stderr
      const trimmed = trimTail(out, 3000)
      console.log(`  ← ${ok ? 'ok' : 'error'} (${out.length} chars stdout/err)`)
      toolOutputs.push(
        `Command: mbg-cli ${argsLine}\nResult (${ok ? 'ok' : 'error'}):\n${trimmed}`,
      )
    }
    messages.push({
      role: 'user',
      content: toolOutputs.join('\n\n---\n\n'),
    })
  }

  console.log()
  console.log(`(reached MAX_TURNS=${MAX_TURNS} without a final answer)`)
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})
