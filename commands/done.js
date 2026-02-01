import { intro, log, outro, spinner } from '@clack/prompts'
import { loadValidatedConfig } from '../lib/config.js'
import { createTrelloClient, moveCardToList } from '../lib/trello.js'
import { markPrReady, assignReviewers } from '../lib/github.js'
import { getTrelloCardIdFromBranch } from '../lib/git.js'

async function getCardId(baseBranch) {
  const cardId = await getTrelloCardIdFromBranch(baseBranch)

  if (!cardId) {
    log.error('Could not find Trello card ID in commit history.')
    process.exit(1)
  }

  return cardId
}

async function markReady() {
  const s = spinner()
  s.start('Marking PR as ready for review')

  try {
    await markPrReady()
    s.stop('PR marked ready')
  } catch (error) {
    s.stop('Failed to mark PR ready')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

async function requestReviewers(reviewers) {
  const s = spinner()
  s.start('Assigning reviewers')

  try {
    await assignReviewers(reviewers)
    s.stop('Reviewers assigned')
  } catch (error) {
    s.stop(`Failed to assign reviewers: ${error.message}`)
  }
}

async function moveCardToReview(trello, cardId, reviewListId) {
  const s = spinner()
  s.start('Moving card to review')

  try {
    await moveCardToList(trello, cardId, reviewListId)
    s.stop('Card moved to review')
  } catch (error) {
    s.stop('Failed to move card')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

export async function done() {
  intro('Mark PR Ready for Review')

  const config = loadValidatedConfig()
  const trello = createTrelloClient(config.trello.apiKey, config.trello.apiToken)

  const cardId = await getCardId(config.github.baseBranch)

  await markReady()
  await requestReviewers([config.github.defaultReviewer])
  await moveCardToReview(trello, cardId, config.trello.lists.review)

  outro('PR is ready for review!')
}
