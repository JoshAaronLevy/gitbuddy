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
const directory = process.cwd();
const enquirer_1 = __importDefault(require("enquirer"));
let spinner = null;
let remoteUrl = "";
let branchUrl = "";
let stageFlag = false;
let commitFlag = false;
let defaultMessage = "";
let message = "";
let unstagedFiles = [];
let stagedFiles = [];
let pushFlag = false;
let currentBranch = "";
let modifiedFiles = [];
exports.default = (commandOptions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (commandOptions.all) {
            stageFlag = true;
        }
        if (commandOptions.commitMessage) {
            commitFlag = true;
            defaultMessage = commandOptions.commitMessage;
        }
        if (commandOptions.push) {
            pushFlag = true;
        }
        remoteUrl = yield getRepoUrls();
        currentBranch = yield identifyCurrentBranch();
        branchUrl = `${remoteUrl}/tree/${currentBranch}`;
        yield checkStatus();
        process.exit(0);
    }
    catch (error) {
        console.log(error);
        return error;
    }
});
const getRepoUrls = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
        const p = yield execa("git", ["remote", "-v"], { cwd: directory, all: true });
        const remoteUrlList = [p.all][0].split("\n").filter(url => url.includes("origin"));
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
        const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
        const p = yield execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd: directory,
            all: true
        });
        return p.stdout;
    }
    catch (error) {
        console.log(error);
    }
});
const checkStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
        const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
        const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
        spinner = ora("Gathering file changes...").start();
        let untrackedFileList = [];
        let fileList = [];
        let untrackedIndex = 0;
        let modifiedLength = 0;
        let newLength = 0;
        let deletedLength = 0;
        let totalFilesChanged = 0;
        const p = yield execa("git", ["status"], { cwd: directory });
        fileList = p.stdout.split("\n");
        for (let i = 0; i < fileList.length; i++) {
            fileList[i] = fileList[i].trim();
            if (fileList[i] === "Untracked files:") {
                untrackedIndex = i + 2;
            }
            if (fileList[i].includes("modified:")) {
                modifiedFiles.push(fileList[i].slice(12) + " " + chalk.yellow.bold("~"));
                modifiedLength++;
            }
            if (fileList[i].includes("deleted:")) {
                modifiedFiles.push(fileList[i].slice(12) + " " + chalk.red.bold("x"));
                deletedLength++;
            }
        }
        if (untrackedIndex > 0) {
            untrackedFileList = fileList.slice(untrackedIndex, fileList.length - 2);
            for (let i_2 = 0; i_2 < untrackedFileList.length; i_2++) {
                if (untrackedFileList[i_2] !== "") {
                    unstagedFiles.push(untrackedFileList[i_2]);
                    modifiedFiles.push(untrackedFileList[i_2] + " " + chalk.green.bold("+"));
                    newLength++;
                }
            }
        }
        totalFilesChanged = modifiedLength + newLength + deletedLength;
        if (totalFilesChanged === 1) {
            spinner.succeed(chalk.bold(`${totalFilesChanged} file change found\n`) +
                chalk.white("Modified: ") + chalk.yellow(`${modifiedLength}\n`) +
                chalk.white("New: ") + chalk.green(`${newLength}\n`) +
                chalk.white("Deleted: ") + chalk.red(`${deletedLength}`));
            return fileSelection();
        }
        else if (totalFilesChanged > 1) {
            spinner.succeed(chalk.bold(`${totalFilesChanged} file changes found\n`) +
                chalk.white("Modified: ") + chalk.yellow(`${modifiedLength}\n`) +
                chalk.white("New: ") + chalk.green(`${newLength}\n`) +
                chalk.white("Deleted: ") + chalk.red(`${deletedLength}`));
            return fileSelection();
        }
        else {
            return spinner.warn(chalk.yellow.bold("ALERT! ") +
                chalk.white("No file changes found"));
        }
    }
    catch (error) {
        console.log(error);
    }
});
const fileSelection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
        spinner = ora();
        if (stageFlag === true) {
            stagedFiles = ["-A"];
            return stagingCommand(stagedFiles);
        }
        else {
            return statusCheck
                .run()
                .then((answer) => {
                if (answer.length < 1) {
                    return noFilesStaged(spinner);
                }
                else {
                    return stagingCommand(answer);
                }
            })
                .catch((error) => {
                console.log(error);
                return noFilesStaged(spinner);
            });
        }
    }
    catch (error) {
        console.log(error);
    }
});
const stagingCommand = (answer) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    for (let i = 0; i < answer.length; i++) {
        answer[i] = answer[i].slice(0, -21);
    }
    const fileCount = answer.length;
    let successMsg = "";
    if (fileCount === 1) {
        successMsg = "1 file staged";
    }
    else {
        successMsg = `${fileCount} files staged`;
    }
    spinner = ora("Staging files...").start();
    try {
        yield execa("git", ["add", ...answer], { cwd: directory, all: true });
        spinner.succeed(chalk.white.bold(`${successMsg}`));
        return commitMessageInput();
    }
    catch (error) {
        return spinner.fail(chalk.red.bold("ERROR! ") + chalk.white(`${error}`));
    }
});
const commitMessageInput = () => {
    if (commitFlag === true) {
        message = defaultMessage;
        return commitCommand(message);
    }
    else {
        return commitMsg
            .run()
            .then((answer) => {
            message = answer;
            if (message.length > 0) {
                return commitCommand(message);
            }
            else {
                return invalidCommitMsg(spinner);
            }
        })
            .catch((error) => {
            console.log(error);
            return abortCommit(spinner);
        });
    }
};
const commitCommand = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    const commitMessage = `${message.replace(/'/g, "\"\"")}`;
    spinner = ora("Committing files...").start();
    try {
        yield execa("git", ["commit", "-m", commitMessage], {
            cwd: directory,
            all: true
        });
        spinner.succeed(chalk.white.bold(`'${message}' successfully committed`));
        return pushConfirm(message);
    }
    catch (error) {
        return spinner.fail(chalk.red.bold("ERROR! ") + chalk.white(`${error}`));
    }
});
const pushConfirm = (message) => {
    if (pushFlag === true) {
        return gitPushStep(message);
    }
    else {
        return pushCheck.run().then((answer) => {
            if (answer === "Yes") {
                return gitPushStep(message);
            }
            else {
                return abortPush(spinner);
            }
        });
    }
};
const gitPushStep = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    const spinner = ora(`Pushing "${message}" to remote repository...`).start();
    try {
        yield execa("git", ["push"], { cwd: directory, all: true });
        return spinner.succeed(chalk.white.bold("Code changes pushed\n") +
            chalk.white.bold("View Repo: ") + chalk.white(`${remoteUrl}\n`) +
            chalk.white.bold("View Branch: ") + chalk.white(`${branchUrl}`));
    }
    catch (p_1) {
        if (p_1.exitCode === 128) {
            spinner.warn(chalk.yellow.bold("ALERT! ") +
                chalk.white(`${currentBranch} branch does not exist in remote repository. Attempting to create and push upstream...`));
            return yield gitPushUpstream(currentBranch);
        }
        else {
            spinner.fail(chalk.red.bold("ERROR! ") +
                chalk.white("Could not push to remote repository. See details below:\n" +
                    `${p_1.all}`));
        }
    }
});
const gitPushUpstream = (currentBranch) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { execa } = yield Promise.resolve().then(() => __importStar(require("execa")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    spinner = ora(`Setting ${currentBranch} upstream and pushing...`).start();
    try {
        yield execa("git", ["push", "-u", "origin", `${currentBranch}`], {
            cwd: directory,
            all: true
        });
        return spinner.succeed(chalk.white.bold("Code changes pushed\n") +
            chalk.white.bold("View Repo: ") + chalk.white(`${remoteUrl}\n`) +
            chalk.white.bold("View Branch: ") + chalk.white(`${branchUrl}`));
    }
    catch (p_1) {
        spinner.fail(chalk.red.bold("ERROR!") +
            chalk.white(" Could not push to remote repository via --set-upstream. See details below:\n" +
                `${p_1}`));
    }
});
const abortPush = (spinner) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    spinner = ora().start();
    spinner.warn(chalk.yellow.bold("ALERT! ") +
        chalk.white("Changes not pushed to remote repository"));
});
const abortCommit = (spinner) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    spinner = ora().start();
    spinner.warn(chalk.yellow.bold("ALERT! ") + chalk.white("Commit step aborted"));
});
const invalidCommitMsg = (spinner) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    spinner = ora().start();
    spinner.warn(chalk.yellow.bold("ALERT! ") +
        chalk.white("Invalid commit message. Commit step aborted"));
});
const noFilesStaged = (spinner) => __awaiter(void 0, void 0, void 0, function* () {
    const { ora } = yield Promise.resolve().then(() => __importStar(require("ora")));
    const { chalk } = yield Promise.resolve().then(() => __importStar(require("chalk")));
    spinner = ora().start();
    spinner.warn(chalk.yellow.bold("ALERT! ") + chalk.white("No files selected to stage"));
});
/* ------------------
GitBuddy Core prompts
------------------ */
const statusCheck = new enquirer_1.default.MultiSelect({
    type: "checkbox",
    name: "stageFiles",
    message: "1/3: Select the files you want to stage (Space to select)",
    choices: modifiedFiles
});
const commitMsg = new enquirer_1.default.Input({
    name: "commitInput",
    message: "2/3: Enter commit message"
});
const pushCheck = new enquirer_1.default.Select({
    name: "pushCheck",
    message: "3/3: Push to remote repository?",
    choices: ["Yes", "No"]
});
