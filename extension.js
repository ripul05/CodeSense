// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const getGPT4js = require("gpt4js");

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// // CommonJS
global.fetch = fetch;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codesense" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('codesense.reviewCode', async function () {
		console.log('Review Code')
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            if (selectedText) {
                const reviewMessage = await performGPT4jsAction(selectedText, "Please review this code");
                vscode.window.showInformationMessage("Code Review: " + reviewMessage);
            } else {
                vscode.window.showWarningMessage("No code selected for review.");
            }
        }
	});

	context.subscriptions.push(disposable);
}
async function performGPT4jsAction(code, action) {
    const messages = [{ role: "user", content: `${action}: ${code}` }];
    const options = {
        provider: "Nextway",
        model: "gpt-4o-free",
        verify: false
    };

    try {
        const GPT4js = await getGPT4js();
        const provider = GPT4js.createProvider(options.provider);
        const responseText = await provider.chatCompletion(messages, options);
        return responseText;
    } catch (error) {
        console.error("Error:", error);
        vscode.window.showErrorMessage("An error occurred while processing the code.");
        return "Error: Unable to process the code.";
    }
}
// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}