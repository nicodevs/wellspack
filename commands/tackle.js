import { intro, select, log, outro, spinner } from '@clack/prompts'
import { handleCancel } from '../lib/prompts.js'
import { loadValidatedConfig } from '../lib/config.js'
import { createTrelloClient, fetchCardsFromList, moveCardToList, addAttachmentToCard } from '../lib/trello.js'
import { checkout, pull, createBranch, commitEmpty, push, hasUncommittedChanges, remoteBranchExists } from '../lib/git.js'
import { createDraftPr, commentOnPr, getPrForBranch } from '../lib/github.js'
import kebabCase from 'lodash/kebabCase.js'

async function validateGitState() {
  if (await hasUncommittedChanges()) {
    log.error('You have uncommitted changes. Please commit or stash them first.')
    process.exit(1)
  }
}

async function prepareBaseBranch(baseBranch) {
  try {
    await checkout(baseBranch)
    log.step(`Switched to ${baseBranch}`)
    await pull()
    log.step(`Pulled ${baseBranch}`)
  } catch (error) {
    log.error(`Failed to prepare ${baseBranch}: ${error.message}`)
    process.exit(1)
  }
}

async function fetchCards(trello, listId, memberId) {
  const s = spinner()
  s.start('Fetching cards')

  try {
    const cards = await fetchCardsFromList(trello, listId, memberId)
    s.stop('Cards fetched')
    return cards
  } catch (error) {
    s.stop('Failed to fetch cards')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

async function promptCardSelection(cards) {
  return handleCancel(await select({
    message: 'Select a card to work on',
    options: cards.map(card => ({
      value: card,
      label: card.name
    }))
  }))
}

async function setupBranch(branchName, cardId) {
  const branchExists = await remoteBranchExists(branchName)

  if (branchExists) {
    try {
      await checkout(branchName)
      log.step(`Switched to existing branch: ${branchName}`)
    } catch (error) {
      log.error(String(error.message || error))
      process.exit(1)
    }
  } else {
    try {
      await createBranch(branchName)
      log.step(`Created branch: ${branchName}`)

      await commitEmpty(`Trello Card ID: ${cardId}`)
      await push(branchName)
      log.step('Pushed to origin')
    } catch (error) {
      log.error(String(error.message || error))
      process.exit(1)
    }
  }
}

async function ensurePullRequest(branchName, baseBranch, cardTitle) {
  const existingPr = await getPrForBranch(branchName)

  if (existingPr) {
    log.step(`Found existing PR: ${existingPr}`)
    return existingPr
  }

  const s = spinner()
  s.start('Creating draft PR')

  try {
    const prUrl = await createDraftPr(baseBranch, cardTitle)
    s.stop(`Created PR: ${prUrl}`)
    return prUrl
  } catch (error) {
    s.stop('Failed to create PR')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

async function linkTrelloCard(trello, card, prUrl) {
  const s = spinner()
  s.start('Linking Trello card')

  try {
    const commentBody = `![](https://github.trello.services/images/mini-trello-icon.png) [${card.name}](${card.url})`
    await commentOnPr(prUrl, commentBody)
    await addAttachmentToCard(trello, card.id, prUrl)
    s.stop('Trello card linked')
  } catch {
    s.stop('Trello card linked')
  }
}

async function moveCardToDoing(trello, cardId, doingListId) {
  const s = spinner()
  s.start('Moving card to doing')

  try {
    await moveCardToList(trello, cardId, doingListId)
    s.stop('Card moved to doing')
  } catch (error) {
    s.stop('Failed to move card')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

export async function tackle() {
  intro('Tackle a Card')

  const config = loadValidatedConfig()
  const trello = createTrelloClient(config.trello.apiKey, config.trello.apiToken)
  const baseBranch = config.github.baseBranch

  await validateGitState()
  await prepareBaseBranch(baseBranch)

  const cards = await fetchCards(trello, config.trello.lists.todo, config.trello.memberId)

  if (!cards.length) {
    log.info('No cards assigned to you in the todo list.')
    outro('Nothing to do!')
    return
  }

  const card = await promptCardSelection(cards)
  const branchName = `${config.trello.initials}/${kebabCase(card.name)}`

  await setupBranch(branchName, card.id)

  const prUrl = await ensurePullRequest(branchName, baseBranch, card.name)

  await linkTrelloCard(trello, card, prUrl)
  await moveCardToDoing(trello, card.id, config.trello.lists.doing)

  outro('Ready to work!')
}
