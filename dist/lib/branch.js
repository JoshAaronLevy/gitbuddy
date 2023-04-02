"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nanospinner_1 = require("nanospinner");
const colorette_1 = require("colorette");
const commit_js_1 = __importDefault(require("./commit.js"));
const enquirer_1 = __importDefault(require("enquirer"));
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
let branchName = "";
let remoteUrl = "";
let commandArgs;
exports.default = (commandOptions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        commandArgs = commandOptions;
        remoteUrl = yield getOriginUrl();
        currentBranch = yield identifyCurrentBranch();
        allBranches = yield identifyAllBranches();
        validBranches = yield identifyValidBranches();
        invalidBranches = yield identifyInvalidBranches();
        return yield selectInitialCmd();
    }
    catch (error) {
        console.error(error);
    }
    process.exit(0);
});
const getOriginUrl = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
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
        const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
        const branchResult = shell.exec("git rev-parse --abbrev-ref HEAD", { silent: true }).stdout;
        return branchResult.trim();
    }
    catch (error) {
        console.log(error);
    }
});
const identifyAllBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    const p = shell.exec("git branch -l", { silent: true });
    const tempBranchList = p.stdout.split("\n");
    return tempBranchList.map(branch => branch.trim());
});
const identifyValidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
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
});
const identifyInvalidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    allBranches.forEach(branch => {
        if (branch.includes("*")) {
            invalidBranches.push(branch);
        }
    });
    invalidBranches.push(currentBranch, ...defaultInvalidBranches);
    return invalidBranches;
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
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    const p = shell.exec("git status --porcelain", { silent: true }).stdout;
    const spinner = (0, nanospinner_1.createSpinner)().start();
    if (p.length > 0) {
        spinner.warn({
            text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) +
                (0, colorette_1.white)("You have uncommitted code changes")
        });
        return codeChangeSelect();
    }
    else {
        spinner.success({
            text: (0, colorette_1.white)("Current working directory is clean")
        });
        return inputBranchName();
    }
});
const codeChangeSelect = () => {
    return gitStatusSelect
        .run()
        .then((answer) => {
        if (answer === "Add, commit, and push changes to current branch first") {
            return runGitBuddyCore(commandArgs);
        }
        else if (answer === "Continue without staging changes") {
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
    yield (0, commit_js_1.default)(commandOptions);
    return inputBranchName();
});
const runStashCommand = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)("Stashing code changes...").start();
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    shell.exec("git stash", { silent: true });
    spinner.success({
        text: (0, colorette_1.white)("Code changes stashed")
    });
    return inputBranchName();
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
    const spinner = (0, nanospinner_1.createSpinner)(`Validating branch name ${input}...`).start();
    if (invalidBranches.includes(input.toLowerCase())) {
        branchName = null;
        input = null;
        spinner.error({
            text: (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) +
                (0, colorette_1.white)(`Branch name ${input} already exists or invalid. Please enter a new branch name.`)
        });
    }
    else {
        spinner.success({
            text: "Branch name validated"
        });
        return createBranch(input);
    }
});
const createBranch = (branchName) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)(`Creating and switching to branch: ${branchName}...`).start();
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    try {
        shell.exec(`git checkout -b ${branchName}`, { silent: true });
        spinner.success({
            text: "Branch created locally. Now working on " + (0, colorette_1.green)((0, colorette_1.bold)(`${branchName}`))
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
    const spinner = (0, nanospinner_1.createSpinner)(`Setting ${branchName} upstream and pushing...`).start();
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    try {
        shell.exec(`git push -u origin ${branchName}`, { silent: true });
        return spinner.success({
            text: (0, colorette_1.white)("Branch created in remote repository\n") +
                (0, colorette_1.green)((0, colorette_1.bold)("Summary:\n")) +
                (0, colorette_1.white)((0, colorette_1.bold)("Branch Name: ")) + (0, colorette_1.white)(`${currentBranch}\n`) +
                (0, colorette_1.white)((0, colorette_1.bold)("Git Remote URL: ")) + (0, colorette_1.white)(`${remoteUrl}`)
        });
    }
    catch (p_1) {
        return spinner.error({
            text: colorette_1.red.bold("ERROR!") +
                (0, colorette_1.white)(" Could not push to remote repository via --set-upstream. See details below:\n" +
                    `${p_1}`)
        });
    }
});
const selectBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)("Checking selected branches...").start();
    return branchSelect
        .run()
        .then((answer) => {
        if (answer.length < 1) {
            return noBranchesSelected();
        }
        else {
            spinner.warn({
                text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) + (0, colorette_1.white)(`Are you sure you want to delete the following branch(es)?\n${answer}`)
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
    const spinner = (0, nanospinner_1.createSpinner)("Deleting branch(es)...").start();
    try {
        for (const branch of deleteBranchList) {
            yield deleteBranch(branch);
        }
        spinner.success({
            text: "Branch(es) successfully deleted"
        });
    }
    catch (error) {
        spinner.error({
            text: (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) + (0, colorette_1.white)(`Could not delete ${deleteBranchList}. Error: ${error}`)
        });
    }
});
const deleteBranch = (branchName) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)(`Deleting branch: ${branchName}...`).start();
    const shell = yield Promise.resolve().then(() => __importStar(require("shelljs")));
    try {
        shell.exec(`git branch -D ${branchName}`, { silent: true });
        spinner.success({
            text: `Branch ${branchName} deleted`
        });
    }
    catch (error) {
        return spinner.error({
            text: (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) + (0, colorette_1.white)(`Could not delete ${branchName}. Error: ${error}`)
        });
    }
});
const branchCreateError = (error) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.error({
        text: (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) + (0, colorette_1.white)(`Could not create branch: ${error}`)
    });
});
const branchDeleteError = (error) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.error({
        text: (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) + (0, colorette_1.white)(`Could not execute branch delete command: ${error}`)
    });
});
const branchCreateAborted = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.warn({
        text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) + (0, colorette_1.white)("Branch creation aborted")
    });
});
const noBranchesSelected = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.warn({
        text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) + (0, colorette_1.white)("No branches selected to delete")
    });
});
const noValidBranches = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.warn({
        text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) + (0, colorette_1.white)("No valid branches found to delete")
    });
});
const branchDeleteAborted = () => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = (0, nanospinner_1.createSpinner)().start();
    return spinner.warn({
        text: (0, colorette_1.yellow)((0, colorette_1.bold)("ALERT! ")) + (0, colorette_1.white)("Branch delete aborted")
    });
});
/* --------------------
GitBuddy Branch prompts
-------------------- */
const branchInit = new enquirer_1.default.Select({
    name: "branchInit",
    message: "What would you like to do?",
    choices: ["Delete local branches", "Create local and remote branch"]
});
const branchCreate = new enquirer_1.default.Input({
    name: "branchInput",
    message: "Enter branch name"
});
const gitStatusSelect = new enquirer_1.default.Select({
    name: "gitStatusSelect",
    message: "What would you like to do?",
    choices: [
        "Add, commit, and push changes to current branch first",
        "Continue without staging changes",
        "Stash changes",
        "Cancel"
    ]
});
const deleteBranchConfirm = new enquirer_1.default.Select({
    name: "deleteBranchConfirm",
    message: "NOTE: This cannot be undone.",
    choices: ["Yes", "No"]
});
const pushConfirm = new enquirer_1.default.Select({
    name: "pushConfirm",
    message: "Would you like to create the branch in your remote repository now?",
    choices: ["Yes", "No"]
});
const branchSelect = new enquirer_1.default.MultiSelect({
    type: "checkbox",
    name: "branchSelect",
    message: "Select the branch(es) you want to delete (Space to select)",
    choices: validBranches
});
