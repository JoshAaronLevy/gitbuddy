"use strict";
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
const colorette_1 = require("colorette");
const commit_js_1 = __importDefault(require("./commit.js"));
const branch_js_1 = __importDefault(require("./branch.js"));
const enquirer_1 = __importDefault(require("enquirer"));
exports.default = (commandOptions) => {
    return selectOperation(commandOptions);
};
const selectOperation = (commandOptions) => {
    return operationSelect
        .run()
        .then((answer) => {
        if (answer === "Commit Changes") {
            return (0, commit_js_1.default)(commandOptions);
        }
        else if (answer === "Manage Branches") {
            return (0, branch_js_1.default)(commandOptions);
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
    return (0, colorette_1.red)((0, colorette_1.bold)("ERROR! ")) + (0, colorette_1.white)(`"Could not execute commandOptions:"\n ${error}`);
});
const commandAlert = (message) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, colorette_1.yellow)((0, colorette_1.bold)("Alert! ")) + (0, colorette_1.white)(`${message}`);
});
/* ------------------
GitBuddy entry prompt
------------------ */
const operationSelect = new enquirer_1.default.Select({
    name: "selectOperation",
    message: "What would you like to do?",
    choices: ["Commit Changes", "Manage Branches"]
});
