import { EOL } from 'os'
import { loadValidatedConfig } from '../lib/config.js'
import { createTrelloClient, fetchCard, fetchList, parseGitHubPr } from '../lib/trello.js'
import { getTrelloCardIdFromBranch, getCurrentBranch } from '../lib/git.js'

const bold = text => `\x1b[1m${text}\x1b[0m`

async function validateBranch(baseBranch) {
  const branch = await getCurrentBranch()

  if (branch === baseBranch) {
    console.error(`You are on the base branch (${branch}). Switch to a feature branch first.`)
    process.exit(1)
  }

  return branch
}

async function getCardId(baseBranch) {
  const cardId = await getTrelloCardIdFromBranch(baseBranch)

  if (!cardId) {
    console.error('Could not find Trello card ID in commit history.')
    process.exit(1)
  }

  return cardId
}

async function fetchCardDetails(trello, cardId) {
  const card = await fetchCard(trello, cardId)
  const list = await fetchList(trello, card.idList)
  const pr = parseGitHubPr(card)

  return { card, list, pr }
}

function formatOutput(card, list, pr, branch) {
  const lines = [
    '',
    bold('Status'),
    '',
    bold('Card'),
    `- Link: ${card.url}`,
    `- Title: ${card.name}`,
    `- List: ${list.name}`
  ]

  if (pr) {
    lines.push(
      '',
      bold('Pull Request'),
      `- Link: ${pr.url}`,
      `- Branch: ${branch}`
    )
  }

  lines.push('')
  return lines.join(EOL)
}

export async function status() {
  const config = loadValidatedConfig()
  const trello = createTrelloClient(config.trello.apiKey, config.trello.apiToken)

  const branch = await validateBranch(config.github.baseBranch)
  const cardId = await getCardId(config.github.baseBranch)
  const { card, list, pr } = await fetchCardDetails(trello, cardId)

  console.log(formatOutput(card, list, pr, branch))
}
