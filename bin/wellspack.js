#!/usr/bin/env node

import { init } from '../commands/init.js'
import { tackle } from '../commands/tackle.js'
import { done } from '../commands/done.js'
import { returnPR } from '../commands/return.js'
import { eod } from '../commands/eod.js'
import { status } from '../commands/status.js'

const command = process.argv[2]
const args = process.argv.slice(3)

const commands = {
  init,
  tackle,
  done,
  return: () => returnPR(args[0]),
  eod,
  status
}

async function main() {
  if (!command || !commands[command]) {
    console.log(`
LOCAL -- Usage:: wellspack <command>

Commands:
  init      Setup wizard for Trello/GitHub configuration
  tackle    Tackle a Trello card (create branch + PR)
  status    Show current card and PR status
  done      Mark current PR as ready for review
  return    Return a PR to draft status
  eod       Generate end-of-day report

Examples:
  npx wellspack init
  npx wellspack tackle
  npx wellspack done
  npx wellspack return https://github.com/owner/repo/pull/123
  npx wellspack eod
`)
    process.exit(command ? 1 : 0)
  }

  try {
    await commands[command]()
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
