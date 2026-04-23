import { EOL } from 'os'
import { loadValidatedConfig } from '../lib/config.js'
import { createTrelloClient, fetchCardsFromList, fetchCardsWithRecentActivity, parseGitHubPr } from '../lib/trello.js'
import filter from 'lodash/filter.js'

function formatCard(card) {
  const pr = parseGitHubPr(card)
  return pr ? `- ${card.name} - [PR #${pr.number}](${pr.url})` : `- ${card.name}`
}

function formatSection(title, cards) {
  return [title, '', ...(cards.length ? cards.map(formatCard) : ['None'])]
}

async function fetchDoneCards(trello, board, lists, memberId, hours) {
  const cards = await fetchCardsWithRecentActivity(trello, board, lists, hours ?? 12)
  return filter(cards, c => c.idMembers?.includes(memberId))
}

async function fetchInProgressCards(trello, listId, memberId) {
  return fetchCardsFromList(trello, listId, memberId)
}

function formatReport(doneCards, inProgressCards) {
  return [
    '@EOD', '',
    ...formatSection('DONE', doneCards), '',
    ...formatSection('IN PROGRESS', inProgressCards)
  ].join(EOL)
}

export async function eod() {
  const config = loadValidatedConfig()
  const trello = createTrelloClient(config.trello.apiKey, config.trello.apiToken)
  const { memberId, lists, board, recentActivityHours } = config.trello

  const doneLists = [lists.review, ...lists.done]
  const doneCards = await fetchDoneCards(trello, board, doneLists, memberId, recentActivityHours)
  const inProgressCards = await fetchInProgressCards(trello, lists.doing, memberId)

  console.log(formatReport(doneCards, inProgressCards))
}
