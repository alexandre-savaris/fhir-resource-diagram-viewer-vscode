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
	const disposable = vscode.commands.registerCommand('fhir-resource-diagram-viewer-vscode.viewContent', async () => {
		// The code you place here will be executed every time your command is executed

		const ANALYSIS_PROMPT = `You are a FHIR resource content analyzer.
Your task is to analyze the content of a FHIR resource, extract relevant information, and generate summaries from your evaluation.
The content is provided in JSON format.
The summaries must be formatted using markdown syntax.
The analyses listed bellow must be executed in order. If it's not possible to execute an analysis, you must inform the user about the reasons.
If the "resourceType" of the main JSON object is different from "Bundle", perform the following analyses.
1. Analyze the resource content and, based on its structure, identity the FHIR release the resource conforms to. Answer only with the FHIR release and with the rationale for your choice.
2. If the resource does not contain a narrative (e.g. the "text" attribute), generate one based on its content. The narrative must be in XHTML, and it must include only the attributes whose type is not "Reference" and that the FHIR release of the resource specify as part of summaries.
If the "resourceType" of the main JSON object is equal to "Bundle", perform the following analyses.
1. Analyze the bundle content and, based on its structure, identity the FHIR release the component resources conform to. Answer only with the FHIR release and with the rationale for your choice.
`;

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
						await vscode.workspace.openTextDocument({
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

						// select the 4o chat model
						let [model] = await vscode.lm.selectChatModels({
							vendor: 'copilot',
							family: 'gpt-4o'
						});
						// init the chat message
						const messages = [
							vscode.LanguageModelChatMessage.User(ANALYSIS_PROMPT),
							vscode.LanguageModelChatMessage.User(documentText)
						];
						// make sure the model is available
						if (model) {
							// send the messages array to the model and get the response
							let chatResponse = await model.sendRequest(
								messages,
								{},
								new vscode.CancellationTokenSource().token
							);
							// show the response
							let fullResponse = '';
							for await (const fragment of chatResponse.text) {
								fullResponse += fragment;
							}
							if (fullResponse.length > 0) {
								// Create a new document with the generated content.
								vscode.workspace.openTextDocument({
									content: fullResponse,
									language: 'md'
								}).then(newDocument => {
									vscode.window.showTextDocument(
										newDocument, {
											viewColumn: vscode.ViewColumn.Beside
										}
									);
								});
							}
						}

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
