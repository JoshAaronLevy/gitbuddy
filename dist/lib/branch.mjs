var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import enquirer from "enquirer";
import shell from "shelljs";
import { createSpinner } from "nanospinner";
import { red, yellow, green, white, bold, underline } from "colorette";
import commit from "./commit.mjs";
let allBranches = [];
let validBranches = [];
let invalidBranches = [];
let defaultInvalidBranches = [
    "master",
    "main",
    "dev",
    "develop",
    "development",
    "qa",
    "stage",
    "staging",
    "prod",
    "production",
    ""
];
let currentBranch = "";
let branchUrl = "";
let branchName = "";
let remoteUrl = "";
let commandArgs;
export default (commandOptions) => __awaiter(void 0, void 0, void 0, function* () {
    commandArgs = commandOptions;
    try {
        remoteUrl = yield getOriginUrl();
        currentBranch = yield identifyCurrentBranch();
        branchUrl = `${remoteUrl}/tree/${currentBranch}`;
        allBranches = yield identifyAllBranches();
        validBranches = yield identifyValidBranches();
        invalidBranches = yield identifyInvalidBranches();
        return yield selectInitialCmd();
    }
    catch (error) {
        console.log(commandArgs);
        console.error(error);
    }
});
const getOriginUrl = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const p = shell.exec("git remote -v", { silent: true }).stdout;
        const remoteUrlList = [p][0].split("\n").filter(url => url.includes("origin"));
        return identifyOriginUrl(remoteUrlList[0]);
    }
    catch (error) {
        console.log(error);
    }
});
const identifyOriginUrl = (rawRemoteUrl) => {
    if (rawRemoteUrl.includes("https")) {
        return rawRemoteUrl.substring(6, rawRemoteUrl.length - 12).trim();
    }
    else if (rawRemoteUrl.includes("github")) {
        return `https://github.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
    }
    else if (rawRemoteUrl.includes("gitlab")) {
        return `https://gitlab.com/${rawRemoteUrl.substring(22, rawRemoteUrl.length - 12).trim()}`;
    }
    else {
        return rawRemoteUrl;
    }
};
const identifyCurrentBranch = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchResult = shell.exec("git rev-parse --abbrev-ref HEAD", { silent: true }).stdout;
        return branchResult.trim();
    }
    catch (error) {
        console.log(error);
    }
});
const identifyAllBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const p = shell.exec("git branch -l", { silent: true });
        const tempBranchList = p.stdout.split("\n");
        return tempBranchList.map(branch => branch.trim());
    }
    catch (error) {
        console.log(error);
    }
});
const identifyValidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        allBranches.forEach(branch => {
            if (!branch.includes("*") &&
                branch !== "master" &&
                branch !== "main" &&
                branch !== currentBranch &&
                branch !== "dev" &&
                branch !== "develop" &&
                branch !== "development" &&
                branch !== "qa" &&
                branch !== "stage" &&
                branch !== "staging" &&
                branch !== "production" &&
                branch !== "prod" &&
                branch !== "") {
                validBranches.push(branch);
            }
        });
        return validBranches;
    }
    catch (error) {
        console.log(error);
    }
});
const identifyInvalidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        allBranches.forEach(branch => {
            if (branch.includes("*")) {
                invalidBranches.push(branch);
            }
        });
        invalidBranches.push(currentBranch, ...defaultInvalidBranches);
        return invalidBranches;
    }
    catch (error) {
        console.log(error);
    }
});
const selectInitialCmd = () => __awaiter(void 0, void 0, void 0, function* () {
    return branchInit
        .run()
        .then((answer) => {
        if (answer === "Create local and remote branch") {
            return checkGitStatus();
        }
        else if (answer === "Delete local branches" && validBranches.length > 0) {
            return selectBranches();
        }
        else if (answer === "Delete local branches" && validBranches.length === 0) {
            return noValidBranches();
        }
        else {
            return branchCreateAborted();
        }
    })
        .catch((error) => {
        console.log(error);
    });
});
const checkGitStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const p = shell.exec("git status --porcelain", { silent: true }).stdout;
        const spinner = createSpinner().start();
        if (p.length > 0) {
            spinner.warn({
                text: yellow(bold("ALERT! ")) +
                    white("You have uncommitted code changes")
            });
            return codeChangeSelect();
        }
        else {
            spinner.success({
                text: white("Current working directory is clean")
            });
            return inputBranchName();
        }
    }
    catch (error) {
        console.log(error);
    }
});
const codeChangeSelect = () => {
    return gitStatusSelect
        .run()
        .then((answer) => {
        if (answer === "Add, commit, and push changes to current branch first") {
            return runGitBuddyCore();
        }
        if (answer === "Continue without staging changes") {
            return inputBranchName();
        }
        else if (answer === "Stash changes") {
            return runStashCommand();
        }
        else if (answer === "Cancel") {
            return branchCreateAborted();
        }
    })
        .catch((error) => {
        return branchCreateError(error);
    });
};
const runGitBuddyCore = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield commit(commandArgs);
        return inputBranchName();
    }
    catch (error) {
        console.log(error);
    }
});
const runStashCommand = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner("Stashing code changes...").start();
        shell.exec("git stash", { silent: true });
        spinner.success({
            text: white("Code changes stashed")
        });
        return inputBranchName();
    }
    catch (error) {
        console.log(error);
    }
});
const inputBranchName = () => {
    return branchCreate
        .run()
        .then((message) => {
        if (message.length > 0) {
            branchName = message;
            return validateNewBranchName(branchName);
        }
        else {
            return branchCreateAborted();
        }
    })
        .catch((error) => {
        return branchCreateError(error);
    });
};
const validateNewBranchName = (input) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner(`Validating branch name ${input}...`).start();
        if (invalidBranches.includes(input.toLowerCase())) {
            branchName = null;
            input = null;
            spinner.error({
                text: red(bold("ERROR! ")) +
                    white(bold(`Branch name ${input} already exists or invalid. Please enter a new branch name.`))
            });
        }
        else {
            spinner.success({
                text: white(bold("Branch name validated"))
            });
            return createBranch(input);
        }
    }
    catch (error) {
        console.log(error);
    }
});
const createBranch = (branchName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner(`Creating and switching to branch: ${branchName}...`).start();
        shell.exec(`git checkout -b ${branchName}`, { silent: true });
        spinner.success({
            text: white(bold("Branch created locally. Now working on ")) + green(bold(`${branchName}`))
        });
        return gitPushCheck(branchName);
    }
    catch (error) {
        return branchCreateError(error.stderr);
    }
});
const gitPushCheck = (branchName) => {
    return pushConfirm
        .run()
        .then((answer) => {
        if (answer === "Yes") {
            return gitPushUpstream(branchName);
        }
        else {
            return answer;
        }
    })
        .catch((error) => {
        return error;
    });
};
const gitPushUpstream = (branchName) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = createSpinner(`Setting ${branchName} upstream and pushing...`).start();
    try {
        const command = `git push --set-upstream origin ${branchName}`;
        const settings = { async: true, silent: true };
        return new Promise((resolve, reject) => {
            shell.exec(command, settings, (code) => handleExecResponse(code, command, settings, resolve, reject));
        }).then(() => {
            return spinner.success({
                text: white(bold("Code changes pushed\n")) +
                    white(bold("View Repo: ")) + white(underline(`${remoteUrl}\n`)) +
                    white(bold("View Branch: ")) + white(underline(`${branchUrl}`))
            });
        }).catch((error) => {
            return spinner.error({
                text: red(bold("ERROR! ") + white(`${error}`))
            });
        });
    }
    catch (p_1) {
        return spinner.error({
            text: red(bold("ERROR!")) +
                white(" Could not push to remote repository via --set-upstream. See details below:\n" +
                    `${p_1}`)
        });
    }
});
const handleExecResponse = (code, command, settings, resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
    if (code === 128) {
        return yield gitPushUpstream(currentBranch);
    }
    else if (code === 0) {
        resolve({ code, command, settings, resolve, reject });
    }
    else {
        reject({ code, command, settings, resolve, reject });
    }
});
const selectBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = createSpinner().start();
    spinner.success({
        text: white(`Found ${validBranches.length} valid branches`)
    });
    return branchSelect
        .run()
        .then((answer) => {
        if (answer.length < 1) {
            return noBranchesSelected();
        }
        else {
            let branchConfirmMessage = "";
            if (answer.length === 1) {
                branchConfirmMessage = "Are you sure you want to delete the following branch?\n";
            }
            else if (answer.length > 1) {
                branchConfirmMessage = `Are you sure you want to delete the following ${answer.length} branches?\n`;
            }
            else {
                branchConfirmMessage = "Are you sure you want to delete the following branch(es)?\n";
            }
            const selectedBranchList = answer.join(",\n");
            spinner.warn({
                text: yellow(bold("ALERT! ")) + white(`${branchConfirmMessage}` + bold(`${selectedBranchList}`))
            });
            return confirmBranchDelete(answer);
        }
    })
        .catch((error) => {
        console.log(error);
        // return branchDeleteError(error);
    });
});
const confirmBranchDelete = (selectedBranches) => {
    return deleteBranchConfirm
        .run()
        .then((answer) => {
        if (answer === "Yes") {
            return deleteSelectedBranches(selectedBranches);
        }
        else {
            return branchDeleteAborted();
        }
    })
        .catch((error) => {
        return branchDeleteError(error);
    });
};
const deleteSelectedBranches = (deleteBranchList) => __awaiter(void 0, void 0, void 0, function* () {
    let branchDeletePending = "";
    let branchDeleteSuccess = "";
    if (deleteBranchList.length === 1) {
        branchDeletePending = `Deleting ${deleteBranchList.length} branch...`;
        branchDeleteSuccess = `${deleteBranchList.length} branch successfully deleted`;
    }
    else if (deleteBranchList.length > 1) {
        branchDeletePending = `Deleting ${deleteBranchList.length} branches...`;
        branchDeleteSuccess = `${deleteBranchList.length} branches successfully deleted`;
    }
    else {
        branchDeletePending = "Deleting branch(es)...";
        branchDeleteSuccess = "Branch(es) successfully deleted";
    }
    const spinner = createSpinner(`${branchDeletePending}`).start();
    try {
        for (const branch of deleteBranchList) {
            yield deleteBranch(branch);
        }
        spinner.success({
            text: `${branchDeleteSuccess}`
        });
    }
    catch (error) {
        spinner.error({
            text: red(bold("ERROR! ")) + white(`Could not delete ${deleteBranchList}. Error: ${error}`)
        });
    }
});
const deleteBranch = (branchName) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = createSpinner(`Deleting branch: ${branchName}...`).start();
    try {
        shell.exec(`git branch -D ${branchName}`, { silent: true });
        spinner.success({
            text: `Branch ${branchName} deleted`
        });
    }
    catch (error) {
        return spinner.error({
            text: red(bold("ERROR! ")) + white(`Could not delete ${branchName}. Error: ${error}`)
        });
    }
});
const branchCreateError = (error) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.error({
            text: red(bold("ERROR! ")) + white(`Could not create branch: ${error}`)
        });
    }
    catch (error) {
        console.log(error);
    }
});
const branchDeleteError = (error) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.error({
            text: red(bold("ERROR! ")) + white(`Could not execute branch delete command: ${error}`)
        });
    }
    catch (error) {
        console.log(error);
    }
});
const branchCreateAborted = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.warn({
            text: yellow(bold("ALERT! ")) + white("Branch creation aborted")
        });
    }
    catch (error) {
        console.log(error);
    }
});
const noBranchesSelected = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.warn({
            text: yellow(bold("ALERT! ")) + white("No branches selected to delete")
        });
    }
    catch (error) {
        console.log(error);
    }
});
const noValidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.warn({
            text: yellow(bold("ALERT! ")) + white("No valid branches found to delete")
        });
    }
    catch (error) {
        console.log(error);
    }
});
const branchDeleteAborted = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spinner = createSpinner().start();
        return spinner.warn({
            text: yellow(bold("ALERT! ")) + white("Branch delete aborted")
        });
    }
    catch (error) {
        console.log(error);
    }
});
/* --------------------
GitBuddy Branch prompts
-------------------- */
const branchInit = new enquirer.Select({
    name: "branchInit",
    message: "What would you like to do?",
    choices: ["Delete local branches", "Create local and remote branch"]
});
const branchCreate = new enquirer.Input({
    name: "branchInput",
    message: "Enter branch name"
});
const gitStatusSelect = new enquirer.Select({
    name: "gitStatusSelect",
    message: "What would you like to do?",
    choices: [
        "Add, commit, and push changes to current branch first",
        "Continue without staging changes",
        "Stash changes",
        "Cancel"
    ]
});
const deleteBranchConfirm = new enquirer.Select({
    name: "deleteBranchConfirm",
    message: "NOTE: This cannot be undone.",
    choices: ["Yes", "No"]
});
const pushConfirm = new enquirer.Select({
    name: "pushConfirm",
    message: "Would you like to create the branch in your remote repository now?",
    choices: ["Yes", "No"]
});
const branchSelect = new enquirer.MultiSelect({
    type: "checkbox",
    name: "branchSelect",
    message: "Select the branch(es) you want to delete (Space to select)",
    choices: validBranches
});
