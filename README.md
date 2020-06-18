
# GitBuddy - Your Buddy

GitBuddy is an interactive CLI that provides simple prompts for common git commands. Prompts make it easy to stage a select groups of files, to help build good git habits, or break bad ones. Shorthand options allow you to easily skip through steps. And it returns clean, semantic responses throughout the process.

## Installation

To get started, run:

```bash
npm install -g gitbuddy
```

## Commands

For the full prompt process:

```bash
gitbuddy
```
> Step 1/3: Lists all available modified and untracked files to select from. Select one or multiple.



> Step 2/3: Simply type your commit message.



> Step 3/3: Confirm whether you want to push your changes to your remote repository or not. GitBuddy even identifies and pushes upstream if your branch doesn't exist in the remote repository yet!

To stage all files (and skip to the commit message prompt):

```bash
gitbuddy -a
```

To push to your remote repository by default (skipping the last prompt):

```bash
gitbuddy -p
```

To add your commit message (and skip the commit message prompt):

```bash
gitbuddy "Your commit message"
```

Or mix and match options (ex: add your commit message and -p, and you will only be prompted to select files to stage. GitBuddy does the rest):

```bash
gitbuddy -p "Your commit message"
```
