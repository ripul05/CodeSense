const vscode = require("vscode");
const getGPT4js = require("gpt4js");
// const fs = require("fs");
const path = require("path");
var showdown  = require('showdown')

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

global.fetch = fetch;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


const XLSX = require("xlsx");

/**
 * @description function to read the code guidelines for code review
 * @param {*} filePath - path of file containing the code guidelines
 * @returns all the rules in text format
 */
function ReadAllSheets(filePath) {
    const workbook = XLSX.readFile(filePath);
    let combinedRules = ""; 
  
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      combinedRules += `Sheet: ${sheetName}\n`;
      data.forEach((row) => {
        combinedRules += row.join(", ") + "\n";
      });
      combinedRules += "\n";
    });
  
    return combinedRules;
  }
  
  const filePath = path.join(__dirname, 'Node_JS_CodingStandards.xlsx');
  const combinedRules = ReadAllSheets(filePath);


/**
 * @description function to activate the extension for review and optimization of code
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  console.log('Congratulations, your extension "codesense" is now active!');

  //registering the command for review code as mentioned in package.json
  const reviewDisposable = vscode.commands.registerCommand(
    "codesense.reviewCode",
    async function () {
      console.log("Review Code");
      const editor = vscode.window.activeTextEditor;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "Reviewing Code",
          cancellable: false,
        },
        //adding a loader
        async (progress) => {
          progress.report({
            increment: 0,
          });
          if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            if (selectedText) {
              // Perform the review action
              const reviewMessage = await performGPT4jsAction(
                selectedText,
                `Review the provided code according to the specified rules in ${combinedRules}. List any unmet rules with their rule number, name, and a clear explanation of each issue in a properly numbered and sequential format. For each identified issue, provide improvement suggestions. The document should display the heading 'Code Review Results,' with the original code at the top, a detailed review report with numbered issues and recommendations in the middle, and the reviewed code and key improvements at the bottom, aligned with the standards.`
              );

              //creating web view for review
              const panel = vscode.window.createWebviewPanel(
                "codeReview", // Internal identifier of the webview
                "Code Review Result", // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in
                { enableScripts: true } // Enable scripts in the webview
              );
              const converter = new showdown.Converter({
                ghCodeBlocks: true,
                tables: true,
                tasklists: true,
                simplifiedAutoLink: true
            });
            
            // Convert Markdown to HTML with separate code blocks
            const htmlContent = converter.makeHtml(reviewMessage);
            const styledHtml = `
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: black;
                    color: white;
                }
                h3 {
                    color: #3776a1;
                }
                strong {
                    color: #007acc;
                }
                pre {
                    background-color: black;
                    padding: 15px;
                    border: 2px solid rgb(47, 47, 74);
                    border-radius: 15px;
                    overflow-x: auto;
                    box-shadow: 
                        rgba(47, 47, 74, 0.25) 0px 64px 65px,
                        rgba(47, 47, 74, 0.12) 0px -20px 40px,
                        rgba(47, 47, 74, 0.12) 0px 8px 10px,
                        rgba(47, 47, 74, 0.17) 0px 20px 23px,
                        rgba(47, 47, 74, 0.09) 0px -6px 10px;
                }
                code {
                    color: #e3d1d1;
                }
                #content {
                    background-color: black;
                }
                .bold {
                    font-weight: 600;
                    color: #c45b16;
                    font-size: 12px;
                }
            </style>
            ${htmlContent}
        `;
            
            // Add custom styling for code blocks to make them stand out
              panel.webview.html =styledHtml
            } else {
              vscode.window.showWarningMessage("No code selected for review.");
            }
          }
          progress.report({
            increment: 100,
          });
        }
      );
    }
  );

  //registering command for optimization of code as mentioned in package.json
  const optimizeDisposable = vscode.commands.registerCommand(
    "codesense.optimizeCode",
    async function () {
      console.log("Optimize Code");
      const editor = vscode.window.activeTextEditor;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "Optimizing Code",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 0,
          });
          if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            if (selectedText) {
              const optimizeMessage = await performGPT4jsAction(
                selectedText,
                "Please optimize the given code following best practices. Additionally, offer suggestions for further enhancements. Structure the response with the heading 'Code Optimization Result', the original code at the top, a detailed report in the middle outlining issues and suggested improvements in a logical sequence, and the optimized code and key improvements at the bottom for easy comparison."
              );

              //creating web view for optimization
              const panel = vscode.window.createWebviewPanel(
                "codeOptimization", // Internal identifier of the webview
                "Code Optimization Result", // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in
                { enableScripts: true } // Enable scripts in the webview
              );

              // HTML content for the webview
              const converter = new showdown.Converter({
                ghCodeBlocks: true,
                tables: true,
                tasklists: true,
                simplifiedAutoLink: true
            });
            
            // Convert Markdown to HTML with separate code blocks
            const htmlContent = converter.makeHtml(optimizeMessage);
            
            // Add custom styling for code blocks to make them stand out
            const styledHtml = `
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: black;
                        color: white;
                    }
                    h3 {
                        color: #3776a1;
                    }
                    strong {
                        color: #007acc;
                    }
                    pre {
                        background-color: black;
                        padding: 15px;
                        border: 2px solid rgb(47, 47, 74);
                        border-radius: 15px;
                        overflow-x: auto;
                        box-shadow: 
                            rgba(47, 47, 74, 0.25) 0px 64px 65px,
                            rgba(47, 47, 74, 0.12) 0px -20px 40px,
                            rgba(47, 47, 74, 0.12) 0px 8px 10px,
                            rgba(47, 47, 74, 0.17) 0px 20px 23px,
                            rgba(47, 47, 74, 0.09) 0px -6px 10px;
                    }
                    code {
                        color: #e3d1d1;
                    }
                    #content {
                        background-color: black;
                    }
                    .bold {
                        font-weight: 600;
                        color: #c45b16;
                        font-size: 12px;
                    }
                </style>
                ${htmlContent}
            `;

            
            // Set the webview HTML content
            panel.webview.html = styledHtml;
            } else {
              vscode.window.showWarningMessage(
                "No code selected for optimization."
              );
            }
          }
          progress.report({
            increment: 100,
          });
        }
      );
    }
  );

  context.subscriptions.push(reviewDisposable);
  context.subscriptions.push(optimizeDisposable);
}

/**
 * @description function to make a hit at the generative AI model
 * @param {*} code - the code that is selected for optimization and review
 * @param {*} action - the prompt given to the model
 * @returns 
 */
async function performGPT4jsAction(code, action) {
  const messages = [{ role: "user", content: `${action}: ${code}` }];
  const options = {
    provider: "Nextway",
    model: "gpt-4o-free",
    verify: false,
  };

  try {
    const GPT4js = await getGPT4js();
    const provider = GPT4js.createProvider(options.provider);
    const responseText = await provider.chatCompletion(messages, options);
    return responseText;
  } catch (error) {
    console.error("Error:", error);
    vscode.window.showErrorMessage(
      "An error occurred while processing the code."
    );
    return "Error: Unable to process the code.";
  }
}
// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
