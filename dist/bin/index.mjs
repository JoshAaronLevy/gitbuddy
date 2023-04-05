var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Command } from "commander";
const program = new Command();
import { isColorSupported } from "colorette";
import main from "../lib/main.mjs";
import branch from "../lib/branch.mjs";
import commit from "../lib/commit.mjs";
let commandOptions = {
    colorSupported: isColorSupported,
    flags: {
        all: false,
        push: false,
        commit: false,
        branch: false
    },
    commitMessage: null
};
program.description("Example: gitbuddy \"I fixed a bug\"")
    .option("[message]", "Commit message")
    .option("-A, -a, --all", "Stage all files")
    .option("-p, --push", "Automatically push to remote repository")
    .option("-b, --branch", "Manage branches")
    .option("-c, --commit", "Commit prompts")
    .version("5.1.9", "-v, --version")
    .action((message, command) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (Object.keys(command._optionValues).length > 0) {
            Object.keys(command._optionValues).map((key) => commandOptions.flags[key] = true);
        }
        if (command.args.length > 0) {
            commandOptions.commitMessage = command.args[0];
        }
        const includedFlags = Object.values(commandOptions.flags).filter((value) => value === true);
        if (includedFlags.length > 0) {
            if (commandOptions.flags.branch === true) {
                return yield branch(commandOptions);
            }
            else {
                return yield commit(commandOptions);
            }
        }
        else {
            return yield main(commandOptions);
        }
    }
    catch (error) {
        console.log(error);
    }
}));
program.parse(process.argv);
