
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

![](/assets/GitBuddy_Step_1.gif)

> Step 2/3: Simply type your commit message.

![](/assets/GitBuddy_Step_2.gif)

> Step 3/3: Confirm whether you want to push your changes to your remote repository or not. GitBuddy even identifies and pushes upstream if your branch doesn't exist in the remote repository yet!

![](/assets/GitBuddy_Step_3.gif)

## Options/Flags

To stage all files (and skip to the commit message prompt), use the `-a` or `-A` flag:

```bash
gitbuddy -a
```

![](/assets/GitBuddy_Add_Flag.gif)

To push to your remote repository by default (skipping the last prompt), use the `-p` flag:

```bash
gitbuddy -p
```

![](/assets/GitBuddy_P_Flag.gif)

To add your commit message (and skip the commit message prompt):

```bash
gitbuddy "Your commit message"
```

![](/assets/GitBuddy_Commit_Flag.gif)

Mix and match options (ex: add your commit message and -p, and you will only be prompted to select files to stage. GitBuddy does the rest):

```bash
gitbuddy -p "Your commit message"
```

![](/assets/GitBuddy_Combo_Flags.gif)

Or chain the options together (in no particular order) to run it all in one command:

```bash
gitbuddy -a -p "Your commit message"
```

![](/assets/GitBuddy_All_Flags.gif)
