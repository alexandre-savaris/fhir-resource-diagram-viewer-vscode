// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fhir-reference-viewer-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('fhir-resource-diagram-viewer-vscode.viewContent', () => {
		// The code you place here will be executed every time your command is executed

		// If there is an active text editor, use it.
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {

			// Retrieve content from the active text editor.
			const documentText = activeTextEditor.document.getText();

			try {

				// Parse the retrieved content as JSON.
				const jsonContent = JSON.parse(documentText);

				let processResult = null;
				if (jsonContent['resourceType']) {

					// Process the resource content.
					processResult = processResourceContent(jsonContent);

					let plantUmlExt = vscode.extensions.getExtension('jebbs.plantuml');
					if (plantUmlExt) {
						let importedApi = plantUmlExt.exports;
						// Create a new document with the generated content.
						vscode.workspace.openTextDocument({
							content: processResult,
							language: 'txt'
						}).then(newDocument => {
							vscode.window.showTextDocument(
								newDocument
							).then(textEditor => {
								vscode.commands.executeCommand('plantuml.preview');
							});
						});
					} else {
						vscode.window.showErrorMessage("The extension 'jebbs.plantuml' couldn't be opened!");
					}

				}

			} catch(e: any) {
				vscode.window.showErrorMessage(e.message);
			}
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Process a resource bundle.
function processResourceContent(jsonContent: any) {

	return '@startjson\n'
		+ JSON.stringify(jsonContent)
		+ '\n@endjson';
}
