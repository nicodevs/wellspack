import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { log } from '@clack/prompts'
import merge from 'lodash/merge.js'

const CONFIG_FILE = 'wellspack.config.json'

const configSchema = z.object({
  trello: z.object({
    board: z.string().nullable().default(null),
    lists: z.object({
      todo: z.string().nullable().default(null),
      doing: z.string().nullable().default(null),
      review: z.string().nullable().default(null),
      done: z.array(z.string()).default([])
    }).default({}),
    apiKey: z.string().nullable().default(null),
    apiToken: z.string().nullable().default(null),
    memberId: z.string().nullable().default(null),
    initials: z.string().length(2).nullable().default(null),
    recentActivityHours: z.number().int().positive().nullable().default(null)
  }).default({}),
  github: z.object({
    baseBranch: z.string().nullable().default(null),
    defaultReviewer: z.string().nullable().default(null)
  }).default({})
})

function getDefaultConfig() {
  return configSchema.parse({})
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return null

  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
    const result = configSchema.safeParse(raw)

    if (!result.success) {
      log.error('Configuration validation failed:')
      log.error(z.prettifyError(result.error))
      process.exit(1)
    }

    return result.data
  } catch (error) {
    log.error('Error reading config file: ' + error.message)
    process.exit(1)
  }
}

function loadValidatedConfig() {
  const config = loadConfig()

  if (!config) {
    log.error('No configuration found. Run "npx wellspack init" first.')
    process.exit(1)
  }

  const { trello, github } = config
  if (!trello.apiKey || !trello.apiToken || !trello.memberId || !trello.initials || !trello.board) {
    log.error('Missing configuration. Run "npx wellspack init" first.')
    process.exit(1)
  }

  if (!trello.lists.todo || !trello.lists.doing || !trello.lists.review) {
    log.error('Missing list configuration. Run "npx wellspack init" first.')
    process.exit(1)
  }

  if (!trello.lists.done?.length) {
    log.error('Missing "done" lists configuration. Run "npx wellspack init" first.')
    process.exit(1)
  }

  if (!github.defaultReviewer || !github.baseBranch) {
    log.error('Missing GitHub configuration. Run "npx wellspack init" first.')
    process.exit(1)
  }

  return config
}

function saveConfig(config) {
  try {
    const merged = merge({}, getDefaultConfig(), config)
    writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2))
  } catch (error) {
    log.error('Error writing config file: ' + error.message)
    process.exit(1)
  }
}

export { getDefaultConfig, loadConfig, loadValidatedConfig, saveConfig }
