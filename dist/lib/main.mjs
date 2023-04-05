var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { red, white, yellow, bold } from "colorette";
import enquirer from "enquirer";
import commit from "./commit.mjs";
import branch from "./branch.mjs";
export default (commandOptions) => {
    return selectOperation(commandOptions);
};
const selectOperation = (commandOptions) => {
    return operationSelect
        .run()
        .then((answer) => {
        if (answer === "Commit Changes") {
            return commit(commandOptions);
        }
        else if (answer === "Manage Branches") {
            return branch(commandOptions);
        }
        else {
            return commandAlert("No option selected");
        }
    })
        .catch((error) => {
        return commandError(error);
    });
};
const commandError = (error) => __awaiter(void 0, void 0, void 0, function* () {
    return red(bold("ERROR! ")) + white(`"Could not execute commandOptions:"\n ${error}`);
});
const commandAlert = (message) => __awaiter(void 0, void 0, void 0, function* () {
    return yellow(bold("Alert! ")) + white(`${message}`);
});
/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new enquirer.Select({
    name: "selectOperation",
    message: "What would you like to do?",
    choices: ["Commit Changes", "Manage Branches"]
});
