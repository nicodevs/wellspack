# Wellspack

CLI tool integrating Trello and GitHub. Manage cards, create branches, open PRs, and generate daily reports.

## Usage

```bash
npx wellspack <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Guides you through configuring your Trello API credentials, board, lists, and account, as well as your GitHub default reviewer. Creates a `wellspack.config.json` file with your settings |
| `tackle` | Lets you pick a "To Do" card assigned to you. Once picked, it creates a new branch and a draft PR for it, and moves the card to the "Doing" list |
| `done` | Marks the current branch's PR as ready for review, assigns the configured default reviewer, and moves the linked Trello card to the "Review" list |
| `return` | Takes a PR link as an argument, converts it back to draft status, finds the linked Trello card in the "Review" list, and moves it back to the "Doing" list |
| `status` | Shows the current branch's linked Trello card details (title, list, link) and PR info (link, branch name) |
| `eod` | Generates an end-of-day report with two sections: "DONE" lists cards with activity in the last 12 hours, "DOING" lists cards currently in the "Doing" list |

## Requirements

- Node.js >= 22
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated

## Setup

Run the `init` command to configure your Trello and GitHub integration:

```bash
npx wellspack init
```

The setup wizard will guide you through:

- Getting your Trello API key and token
- Selecting your Trello board and lists
- Choosing your Trello account and initials
- Setting a default GitHub reviewer

This creates a `wellspack.config.json` file with your settings.

> [!NOTE]
> The config file contains API keys. Add it to `.gitignore` to keep credentials private. The wizard will offer to do that automatically.

## Workflow

### 1. Tackle a card

Pick a card from your "To Do" list to start working on it:

```bash
npx wellspack tackle
```

This will:

- Move the card to the "Doing" list
- Create a feature branch named after your initials and the slugified card title, for example `jd/some-cool-task`
- Open a draft PR and print the link to it

### 2. Mark as done

When you are done with the task, run `done`:

```bash
npx wellspack done
```

This will:

- Promote the draft PR to "Ready for review"
- Assign the default reviewer to it
- Move the Trello card to the "Review" list

### 3. Return to draft

If changes are needed, the reviewer can run `return` and pass the PR link as a parameter:

```bash
npx wellspack return https://github.com/owner/repo/pull/123
```

This will:

- Change the PR status to draft
- Move the Trello card back to the "Doing" list

### 4. Check status

To see the current card and PR info, run `status`:

```bash
npx wellspack status
```

Example output:

```
Status

Card
- Link: https://trello.com/c/mq67XBt2/398-fix-login-error
- Title: Fix login error
- List: Doing

Pull Request
- Link: https://github.com/owner/repo/pull/359
- Branch: nd/fix-login-error
```

### 5. End of day report

Generate a summary of your day in Markdown format.

```bash
npx wellspack eod
```

The report will include:

- A DOING section with cards currently in the "Doing" list.
- A DONE section with cards currently in the "Done" lists that you have selected, limited to those with activity in the last 12 hours.

## License

MIT

## Author

Nico Devs

[nicodevs.com](https://nicodevs.com)
