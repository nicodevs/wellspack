import { execa } from 'execa'

function git(...args) {
  return execa('git', args, { stdio: 'pipe' })
}

function checkout(branch) {
  return git('checkout', branch)
}

function pull() {
  return git('pull')
}

function createBranch(name) {
  return git('checkout', '-b', name)
}

function commitEmpty(msg) {
  return git('commit', '--allow-empty', '--no-verify', '-m', msg)
}

function push(branch) {
  return git('push', '-u', 'origin', branch)
}

async function hasUncommittedChanges() {
  const { stdout } = await git('status', '--porcelain')
  const lines = stdout.trim().split('\n').filter(Boolean)
  return lines.some(line => !line.startsWith('??'))
}

async function remoteBranchExists(branch) {
  try {
    await git('ls-remote', '--exit-code', '--heads', 'origin', branch)
    return true
  } catch {
    return false
  }
}

async function getTrelloCardIdFromBranch(baseBranch) {
  const { stdout } = await git('log', `${baseBranch}..HEAD`, '--reverse', '--format=%s')
  const firstCommit = stdout.trim().split('\n').at(0)
  const match = firstCommit?.match(/^Trello Card ID: (.+)$/)
  return match?.[1] ?? null
}

async function getCurrentBranch() {
  const { stdout } = await git('branch', '--show-current')
  return stdout.trim()
}

async function isGitRepository() {
  try {
    await git('rev-parse', '--is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

async function getDefaultBranch() {
  try {
    const { stdout } = await git('symbolic-ref', 'refs/remotes/origin/HEAD')
    return stdout.trim().replace('refs/remotes/origin/', '')
  } catch {
    return null
  }
}

export { checkout, pull, createBranch, commitEmpty, push, hasUncommittedChanges, remoteBranchExists, getTrelloCardIdFromBranch, getCurrentBranch, isGitRepository, getDefaultBranch }
