import { execa } from 'execa'

function gh(...args) {
  return execa('gh', args, { stdio: 'pipe' })
}

async function createDraftPr(baseBranch, title) {
  const { stdout } = await gh('pr', 'create', '--draft', '--base', baseBranch, '--title', title, '--body', '', '--assignee', '@me')
  return stdout.trim()
}

function commentOnPr(prUrl, body) {
  return gh('pr', 'comment', prUrl, '--body', body)
}

function markPrReady() {
  return gh('pr', 'ready')
}

function assignReviewers(reviewers) {
  return gh('pr', 'edit', '--add-reviewer', reviewers.join(','))
}

function convertPrToDraft(prNumber) {
  return gh('pr', 'ready', '--undo', String(prNumber))
}

async function getPrForBranch(branch) {
  try {
    const { stdout } = await gh('pr', 'view', branch, '--json', 'url', '--jq', '.url')
    return stdout.trim() || null
  } catch {
    return null
  }
}

async function getDefaultBranch() {
  try {
    const { stdout } = await gh('repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name')
    return stdout.trim() || null
  } catch {
    return null
  }
}

export { createDraftPr, commentOnPr, markPrReady, assignReviewers, convertPrToDraft, getPrForBranch, getDefaultBranch }
