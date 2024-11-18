/* eslint-disable no-const-assign */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const getGPT4js = require("gpt4js");
// const fs = require("fs");
const path = require("path");
var showdown  = require('showdown')

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// // CommonJS
global.fetch = fetch;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Required Constants
const XLSX = require("xlsx");

function ReadAllSheets(filePath) {
    const workbook = XLSX.readFile(filePath);
    let combinedRules = ""; // Use a local variable instead of a global one
  
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      combinedRules += `Sheet: ${sheetName}\n`;
      data.forEach((row) => {
        combinedRules += row.join(", ") + "\n";
      });
      combinedRules += "\n";
    });
  
    return combinedRules; // Return the combined text
  }
  
  // Example usage
  const filePath = path.join(__dirname, 'Node_JS_CodingStandards.xlsx');
  const combinedRules = ReadAllSheets(filePath);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

function getWebviewContent(message, title) {
  const lines = message.split("\n");

  // Variables to hold parsed content
  let htmlContent = "";
  let insideCodeBlock = false;

  // Loop through each line and categorize it
  lines.forEach((line) => {
    line = line.trim(); // Trim extra whitespace

    if (line.startsWith("###")) {
      // Heading
      htmlContent += `<h2>${line.replace("###", "").trim()}</h2>`;
    } else if (line.startsWith("**") && line.endsWith("**")) {
      // Title within a list (e.g., Rule titles)
      htmlContent += `<h3>${line.replace(/\*\*/g, "").trim()}</h3>`;
    } else if (line.startsWith("```javascript")) {
      // Code block start
      insideCodeBlock = true;
      htmlContent += '<div class="code-block"><pre><code>';
    } else if (line.startsWith("```")) {
      // Code block end
      insideCodeBlock = false;
      htmlContent += "</code></pre></div>";
    } else if (insideCodeBlock) {
      // Inside code block
      htmlContent += `${line}\n`; // Keep line breaks for code readability
    } else if (line) {
      // Regular paragraph
      // htmlContent += `<p>${line}</p>`;
      htmlContent += `<p>${line.replace(
        /\*\*(.*?)\*\*/g,
        '<span class="bold">$1</span>'
      )}</p>`;
    }
  });

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: black;
                    color: white;
                }
                h2{
                    color: #3776a1;
                }
                h1 {
                    color: #007acc;
                }
                pre {
                    background-color: black;
                    padding: 15px;
                    border: 2px solid rgb(47, 47, 74);
                    border-radius: 15px;
                    overflow-x: auto;
                    box-shadow: 
                    rgba(47, 47, 74, 0.25) 0px 64px 65px,   /* Increased Offset-Y from 54px to 64px and Blur Radius from 55px to 65px */
                    rgba(47, 47, 74, 0.12) 0px -20px 40px,  /* Increased Offset-Y from -12px to -20px and Blur Radius from 30px to 40px */
                    rgba(47, 47, 74, 0.12) 0px 8px 10px,    /* Increased Offset-Y from 4px to 8px and Blur Radius from 6px to 10px */
                    rgba(47, 47, 74, 0.17) 0px 20px 23px,   /* Increased Offset-Y from 12px to 20px and Blur Radius from 13px to 23px */
                    rgba(47, 47, 74, 0.09) 0px -6px 10px;   /* Increased Offset-Y from -3px to -6px and Blur Radius from 5px to 10px */
                }
                code {
                    color: #e3d1d1;
                }
                #content{
                    background-color: black;
                }
                .bold{
                    font-weight: 600;
                    color: #c45b16;
                    font-size: 12px
                }
                    
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div id = "content">${htmlContent}</div>
        </body>
        </html>
    `;
}

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
