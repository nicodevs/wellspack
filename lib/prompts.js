import { cancel, isCancel } from '@clack/prompts'

function handleCancel(value) {
  if (isCancel(value)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return value
}

export { handleCancel }
