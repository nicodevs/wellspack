import { intro, log, outro, spinner } from '@clack/prompts'
import { loadValidatedConfig } from '../lib/config.js'
import { createTrelloClient, fetchCardsFromList, moveCardToList, findCardWithPrAttachment } from '../lib/trello.js'
import { convertPrToDraft } from '../lib/github.js'

function parsePrNumber(prLink) {
  const match = prLink.match(/\/pull\/(\d+)/)
  return match ? match[1] : null
}

function validatePrLink(prLink) {
  if (!prLink) {
    log.error('Please provide a PR link: npx wellspack return <pr-link>')
    process.exit(1)
  }

  const prNumber = parsePrNumber(prLink)

  if (!prNumber) {
    log.error('Invalid PR link. Expected format: https://github.com/owner/repo/pull/123')
    process.exit(1)
  }

  return prNumber
}

async function revertToDraft(prNumber) {
  const s = spinner()
  s.start('Converting PR to draft')

  try {
    await convertPrToDraft(prNumber)
    s.stop('PR converted to draft')
  } catch (error) {
    s.stop('Failed to convert PR')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

async function findCardByPr(trello, reviewListId, prLink) {
  const s = spinner()
  s.start('Finding Trello card')

  try {
    const cards = await fetchCardsFromList(trello, reviewListId)
    const card = findCardWithPrAttachment(cards, prLink)

    if (!card) {
      s.stop('Card not found')
      log.warning('Could not find Trello card with this PR attached.')
      return null
    }

    s.stop('Card found')
    return card
  } catch (error) {
    s.stop('Failed to fetch cards')
    log.warning('Could not search for Trello card: ' + error.message)
    return null
  }
}

async function moveCardToDoing(trello, cardId, doingListId) {
  const s = spinner()
  s.start('Moving card back to doing')

  try {
    await moveCardToList(trello, cardId, doingListId)
    s.stop('Card moved to doing')
  } catch (error) {
    s.stop('Failed to move card')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

export async function returnPR(prLink) {
  intro('Return PR to Draft')

  const prNumber = validatePrLink(prLink)

  const config = loadValidatedConfig()
  const trello = createTrelloClient(config.trello.apiKey, config.trello.apiToken)

  await revertToDraft(prNumber)

  const card = await findCardByPr(trello, config.trello.lists.review, prLink)

  if (card) {
    await moveCardToDoing(trello, card.id, config.trello.lists.doing)
  }

  outro('PR returned to draft status.')
}
