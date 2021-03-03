# GitBuddy - Your Git Best Friend

GitBuddy is an interactive CLI that provides simple prompts for common git commands. Prompts make it easy to stage a select groups of files, to help build good git habits, or break bad ones. Shorthand options allow you to easily skip through steps. And it returns clean, semantic responses throughout the process.

## Installation

**To get started, run:**

```bash
npm install -g gitbuddy
```

## Commands

**For the full prompt process:**

```bash
gitbuddy
```

> Step 1/3: Lists all available modified and untracked files to select from. Select one or multiple.

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Step_1-min.gif)

> Step 2/3: Simply type your commit message.

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Step_2-min.gif)

> Step 3/3: Confirm whether you want to push your changes to your remote repository or not. GitBuddy even identifies and pushes upstream if your branch doesn't exist in the remote repository yet!

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Step_3-min.gif)

## Options/Flags

### Add All Flag

**To stage all files (and skip to the commit message prompt), use the `-a` or `-A` flag:**

```bash
gitbuddy -a
```

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Add_Flag-min.gif)

### Auto Push Flag

**To push to your remote repository by default (skipping the last prompt), use the `-p` flag:**

```bash
gitbuddy -p
```

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_P_Flag-min.gif)

### Commit Message Option

**To add your commit message (and skip the commit message prompt):**

```bash
gitbuddy "Your commit message"
```

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Commit_Flag-min.gif)

### Mix-and-Match Flags/Options

**Mix and match flags/options to initiate only the prompt(s) you want:**

i.e. Add your commit message and -p, and you will only be prompted to select files to stage. GitBuddy does the rest

```bash
gitbuddy -p "Your commit message"
```

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_Combo_Flags-min.gif)

### All-in-One Command

**Chain all the options together (in no particular order) to add, commit, and push, all in just one command:**

```bash
gitbuddy -a -p "Your commit message"
```

![](https://gitbuddy.s3-us-west-2.amazonaws.com/GitBuddy_All_Flags-min.gif)

## Coming Soon

1. Easy branch management
