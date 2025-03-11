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
						// Create a new document with the generated content.
						vscode.workspace.openTextDocument({
							content: processResult,
							language: 'txt'
						}).then(newDocument => {
							vscode.window.showTextDocument(
								newDocument, {
									viewColumn: vscode.ViewColumn.Beside
								}
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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable2 = vscode.commands.registerCommand('fhir-resource-diagram-viewer-vscode.viewReferences', () => {
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
					processResult = processResourceReferences(jsonContent);

					let plantUmlExt = vscode.extensions.getExtension('jebbs.plantuml');
					if (plantUmlExt) {
						// Create a new document with the generated content.
						vscode.workspace.openTextDocument({
							content: processResult,
							language: 'txt'
						}).then(newDocument => {
							vscode.window.showTextDocument(
								newDocument, {
									viewColumn: vscode.ViewColumn.Beside
								}
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
	context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Process the resource content.
function processResourceContent(jsonContent: any) {

	return '@startjson\n'
		+ JSON.stringify(jsonContent)
		+ '\n@endjson';
}

// Process the resource references.
function processResourceReferences(jsonContent: any) {

	for (const [key, value] of Object.entries(jsonContent)) {

		// Keep the 'resourceType' key, or any 'reference' key.
		if (key === 'resourceType' || key === 'id' || key === 'reference') {
			continue;
		}

		// Objects.
		if (typeof value === 'object') {
			if (!dig(value, 'reference')) {
				delete jsonContent[key];
			}
			continue;
		}

		//  Otherwise, delete the key.
		delete jsonContent[key];

	}

	return processResourceContent(jsonContent);
}

// https://www.30secondsofcode.org/js/s/get-nested-object-value/#:~:text=For%20this%20scenario%2C%20you%20can,values()%20and%20Array.
const dig = (obj: any, target: string): any =>
	target in obj
	  ? obj[target]
	  : Object.values(obj).reduce((acc, val) => {
		  if (acc !== undefined) { return acc; }
		  if (typeof val === 'object') { return dig(val, target); }
		}, undefined);
