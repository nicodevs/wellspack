import Trello from 'trello'
import uniq from 'lodash/uniq.js'
import compact from 'lodash/compact.js'
import filter from 'lodash/filter.js'
import find from 'lodash/find.js'

function createTrelloClient(apiKey, apiToken) {
  return new Trello(apiKey, apiToken)
}

async function fetchCardsFromList(trello, listId, memberId = null) {
  const cards = await trello.makeRequest('get', `/1/lists/${listId}/cards`, { attachments: true })
  return memberId ? filter(cards, c => c.idMembers?.includes(memberId)) : cards
}

function fetchMembersFromBoard(trello, boardId) {
  return trello.getBoardMembers(boardId)
}

function fetchListsFromBoard(trello, boardId) {
  return trello.getListsOnBoard(boardId)
}

function fetchCard(trello, cardId) {
  return trello.makeRequest('get', `/1/cards/${cardId}`, { attachments: true })
}

function fetchList(trello, listId) {
  return trello.makeRequest('get', `/1/lists/${listId}`)
}

function moveCardToList(trello, cardId, listId) {
  return trello.makeRequest('put', `/1/cards/${cardId}`, { idList: listId })
}

function addAttachmentToCard(trello, cardId, url) {
  return trello.makeRequest('post', `/1/cards/${cardId}/attachments`, { url })
}

async function fetchCardsWithRecentActivity(trello, boardId, listIds, hours = 12) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const actions = await trello.makeRequest('get', `/1/boards/${boardId}/actions`, {
    since: since.toISOString(),
    limit: 1000
  })

  const cardIds = uniq(compact(actions.map(a => a.data?.card?.id)))

  const cards = await Promise.all(
    cardIds.map(id => trello.makeRequest('get', `/1/cards/${id}`, { attachments: true }).catch(() => null))
  )

  return filter(compact(cards), c => listIds.includes(c.idList))
}

function findCardWithPrAttachment(cards, prUrl) {
  return find(cards, c => c.attachments?.some(a => a.url === prUrl))
}

function parseGitHubPr(card) {
  const att = find(card.attachments, a => a.url?.includes('github.com/') && a.url?.includes('/pull/'))
  if (!att) return null
  const match = att.url.match(/\/pull\/(\d+)/)
  return { url: att.url, number: match?.[1] }
}

export { createTrelloClient, fetchCardsFromList, fetchMembersFromBoard, fetchListsFromBoard, fetchCard, fetchList, moveCardToList, addAttachmentToCard, fetchCardsWithRecentActivity, findCardWithPrAttachment, parseGitHubPr }
