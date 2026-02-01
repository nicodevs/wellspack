import { intro, note, text, password, select, multiselect, log, outro, spinner } from '@clack/prompts'
import { EOL } from 'os'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { handleCancel } from '../lib/prompts.js'
import { loadConfig, saveConfig, getDefaultConfig } from '../lib/config.js'
import { isGitRepository } from '../lib/git.js'
import { createTrelloClient, fetchMembersFromBoard, fetchListsFromBoard } from '../lib/trello.js'

function getTokenUrl(apiKey) {
  return `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=${apiKey}&name=Wellspack`
}

function extractBoardId(url) {
  return url.match(/trello\.com\/b\/([^/]+)/)?.[1]
}

function extractInitials(fullName) {
  if (!fullName) return ''
  const words = fullName.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words.at(0).at(0) + words.at(-1).at(0)).toLowerCase()
  }
  return words.at(0).slice(0, 2).toLowerCase()
}

function addToGitignore(filename) {
  const content = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : ''

  if (content.split(EOL).some(line => line.trim() === filename)) {
    log.info(`${filename} is already in .gitignore`)
    return
  }

  const updated = content + (content && !content.endsWith(EOL) ? EOL : '') + filename + EOL
  writeFileSync('.gitignore', updated)
  log.success(`Added ${filename} to .gitignore`)
}

async function promptTrelloCredentials() {
  log.info('Enter the Trello API key of your Power-Up.')
  log.info('Or create one here:')
  log.message('https://trello.com/power-ups/admin')

  const apiKey = handleCancel(await password({
    message: 'Enter your API key',
    validate: value => value?.length ? undefined : 'API key is required'
  }))

  log.info('Open this URL to get your token:')
  log.message(getTokenUrl(apiKey))
  log.info('Click "Allow" and copy the token')

  const apiToken = handleCancel(await password({
    message: 'Enter your token',
    validate: value => value?.length ? undefined : 'API token is required'
  }))

  return { apiKey, apiToken }
}

async function promptBoardUrl() {
  const boardUrl = handleCancel(await text({
    message: 'Enter your Trello board URL',
    placeholder: 'https://trello.com/b/BOARD_ID/board-name',
    validate: value => {
      if (!value) return 'Board URL is required'
      if (!extractBoardId(value)) return 'Invalid Trello board URL'
      return undefined
    }
  }))

  return extractBoardId(boardUrl)
}

async function fetchLists(trello, boardId) {
  const s = spinner()
  s.start('Fetching lists from board')

  try {
    const lists = await fetchListsFromBoard(trello, boardId)
    s.stop('Lists fetched successfully')

    if (!lists?.length || lists.length < 4) {
      log.error('Board must have at least 4 lists.')
      process.exit(1)
    }

    return lists
  } catch (error) {
    s.stop('Failed to fetch lists')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

function findListByKeywords(lists, keywords) {
  const normalize = str => str.toLowerCase().replace(/[^a-z]/g, '')
  for (const keyword of keywords) {
    const list = lists.find(l => normalize(l.name).includes(keyword))
    if (list) return list.id
  }
}

async function promptListSelection(lists) {
  note('We\'ll fetch cards to tackle from this list.', 'To Do')
  const todoListId = handleCancel(await select({
    message: 'Select your "To Do" list',
    options: lists.map(list => ({ value: list.id, label: list.name })),
    initialValue: findListByKeywords(lists, ['todo', 'backlog'])
  }))

  const availableForDoing = lists.filter(list => list.id !== todoListId)
  note('We\'ll move cards in progress to this list.', 'Doing')
  const doingListId = handleCancel(await select({
    message: 'Select your "Doing" list',
    options: availableForDoing.map(list => ({ value: list.id, label: list.name })),
    initialValue: findListByKeywords(availableForDoing, ['doing', 'inprogress', 'current'])
  }))

  const availableForReview = lists.filter(list => list.id !== todoListId && list.id !== doingListId)
  note('Once a PR is ready for review, we\'ll move the card here.', 'Review')
  const reviewListId = handleCancel(await select({
    message: 'Select your "Review" list',
    options: availableForReview.map(list => ({ value: list.id, label: list.name })),
    initialValue: findListByKeywords(availableForReview, ['review', 'testing', 'qa'])
  }))

  const availableForDone = lists.filter(list => list.id !== todoListId && list.id !== doingListId && list.id !== reviewListId)
  note('We\'ll check the cards you already finished from these lists.', 'Done')
  const doneListIds = handleCancel(await multiselect({
    message: 'Select your "Done" lists (Space to select, Enter to submit)',
    options: availableForDone.map(list => ({ value: list.id, label: list.name })),
    required: true
  }))

  const doingListName = lists.find(l => l.id === doingListId).name
  const doneListNames = doneListIds.map(id => lists.find(l => l.id === id).name)
  const allDoneNames = [lists.find(l => l.id === reviewListId).name, ...doneListNames].join(', ')

  note(
    [
      'DOING will include cards assigned to you in the list:',
      `- ${doingListName}`,
      '',
      'DONE will include cards assigned to you with activity in the last 12 hs from the lists:',
      `- ${allDoneNames}`
    ].join(EOL),
    'Perfect! Your "End of Day" report will have two sections, DOING and DONE.'
  )

  return {
    todo: todoListId,
    doing: doingListId,
    review: reviewListId,
    done: doneListIds
  }
}

async function fetchMembers(trello, boardId) {
  const s = spinner()
  s.start('Fetching members from board')

  try {
    const members = await fetchMembersFromBoard(trello, boardId)
    s.stop('Members fetched successfully')

    if (!members?.length) {
      log.error('No members found on this board.')
      process.exit(1)
    }

    return members
  } catch (error) {
    s.stop('Failed to fetch members')
    log.error(String(error.message || error))
    process.exit(1)
  }
}

async function promptMemberSelection(members) {
  const memberId = handleCancel(await select({
    message: 'Select your Trello account',
    options: members.map(member => ({
      value: member.id,
      label: member.fullName || member.username,
      hint: member.username
    }))
  }))

  const selectedMember = members.find(m => m.id === memberId)
  const defaultInitials = extractInitials(selectedMember?.fullName || selectedMember?.username)

  const initials = handleCancel(await text({
    message: 'Enter your 2-letter initials (for branch names)',
    placeholder: defaultInitials || 'jd',
    defaultValue: defaultInitials,
    validate: value => {
      if (!value) return 'Initials are required'
      if (!/^[a-zA-Z]{2}$/.test(value)) return 'Must be exactly 2 letters'
      return undefined
    }
  }))

  return { memberId, initials: initials.toLowerCase() }
}

async function promptDefaultReviewer() {
  return handleCancel(await text({
    message: 'Enter the GitHub username of the default reviewer',
    placeholder: 'username',
    validate: value => {
      if (!value) return 'Default reviewer is required'
      if (!/^[a-zA-Z0-9-]+$/.test(value)) return 'Invalid GitHub username'
      return undefined
    }
  }))
}

async function promptGitignore() {
  if (!await isGitRepository()) return

  const shouldAdd = handleCancel(await select({
    message: 'Add wellspack.config.json to .gitignore? (Recommended)',
    options: [
      { value: true, label: 'Yes', hint: 'Keep credentials private' },
      { value: false, label: 'No' }
    ]
  }))

  if (shouldAdd) {
    addToGitignore('wellspack.config.json')
  }
}

export async function init() {
  if (existsSync('wellspack.config.json')) {
    console.error('Error: wellspack.config.json already exists. Delete it first to reinitialize.')
    process.exit(1)
  }

  intro('Wellspack Setup')

  note(
    [
      'This wizard will configure your Trello and GitHub integration.',
      'It will create a wellspack.config.json file in the current directory.'
    ].join(EOL),
    'Setup Wizard'
  )

  const { apiKey, apiToken } = await promptTrelloCredentials()
  const boardId = await promptBoardUrl()
  const trello = createTrelloClient(apiKey, apiToken)

  const lists = await fetchLists(trello, boardId)
  const selectedLists = await promptListSelection(lists)

  const members = await fetchMembers(trello, boardId)
  const { memberId, initials } = await promptMemberSelection(members)

  const defaultReviewer = await promptDefaultReviewer()

  const existingConfig = loadConfig() || getDefaultConfig()
  const config = {
    ...existingConfig,
    trello: {
      ...existingConfig.trello,
      apiKey,
      apiToken,
      board: boardId,
      memberId,
      initials,
      lists: selectedLists
    },
    github: {
      ...existingConfig.github,
      defaultReviewer
    }
  }

  saveConfig(config)
  log.success('Configuration saved to wellspack.config.json')

  await promptGitignore()

  outro('Setup complete! Run "npx wellspack tackle" to begin.')
}
