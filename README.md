# Wellspack

CLI tool integrating Trello and GitHub workflows. Manage cards, create branches, open PRs, and generate daily reports.

## Usage

```bash
npx wellspack@latest <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Setup wizard for Trello/GitHub configuration |
| `tackle` | Tackle a Trello card (create branch + PR) |
| `status` | Show current card and PR status |
| `done` | Mark current PR as ready for review |
| `return` | Return a PR to draft status |
| `eod` | Generate end-of-day report |

## Setup

Run the init command to configure your Trello and GitHub integration:

```bash
npx wellspack@latest init
```

The setup wizard will guide you through:

- Getting your Trello API key and token
- Selecting your Trello board and lists
- Choosing your Trello account and initials
- Setting a default GitHub reviewer

This creates a `wellspack.config.json` file with your settings.

> [!NOTE]
> The config file contains API keys. Add it to `.gitignore` to keep credentials private.

## Workflow

### 1. Tackle a card

Pick a card from your "To Do" list to start working on it:

```bash
npx wellspack@latest tackle
```

This will:
- Move the card to "Doing"
- Create a feature branch
- Open a draft PR

### 2. Check status

See the current card and PR info:

```bash
npx wellspack@latest status
```

### 3. Mark as done

When ready for review:

```bash
npx wellspack@latest done
```

This will:
- Mark the PR as ready for review
- Assign reviewers
- Move the card to "Review"

### 4. Return to draft

If changes are needed:

```bash
npx wellspack@latest return https://github.com/owner/repo/pull/123
```

### 5. End of day report

Generate a summary of your day:

```bash
npx wellspack@latest eod
```

## Requirements

- Node.js >= 22
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated

## License

MIT

## Author

Nico Devs

[nicodevs.com](https://nicodevs.com)
