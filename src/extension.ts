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

		// Common prompt fragment.
		const COMMON_PROMPT_FRAGMENT = `
You are a FHIR resource content analyzer.
Your task is to analyze the content of a FHIR resource, extract relevant information, and generate a report from your analysis.
The resource content is provided in JSON format.
The resulting report must be formatted using markdown syntax.
The analyses listed bellow must be executed in order. If it's not possible to execute an specific analysis, you must inform the user about the reasons.
`;
		const SINGLE_RESOURCE_PROMPT_FRAGMENT = `
1. Analyze the resource content and, based on its structure, identify the FHIR release the resource conforms to. Answer only with the FHIR release and with the rationale for your choice.
2. If the resource does not contain a narrative (e.g., the "text" attribute), generate one based on its content. The generated narrative must exclude all attributes whose "ElementDefinition.type" = "Reference" in the FHIR release the resource conforms to. From the remainder attributes, the generated narrative must include only the ones whose "ElementDefinition.isSummary" = true in the FHIR release the resource conforms to.
3. Identify all resource attributes that may refer to a terminology (i.e., attributes where "ElementDefinition.type" = "Coding" or "ElementDefinition.type" = "CodeableConcept" in the FHIR release the resource conforms to). From these attributes, select those that don't present a "text" or a "display" and try to find the corresponding meaning for the combination of "system" and "code". Include the findings in the generated narrative.
`;
		const RESOURCE_BUNDLE_PROMPT_FRAGMENT = `
1. Analyze the bundle content and, based on its structure, identify the FHIR release the component resources conform to. Answer only with the FHIR release and with the rationale for your choice.
2. For each one of the resource instances that compose the Bundle: If the resource instance does not contain a narrative (e.g., the "text" attribute), generate one based on its content. The generated narrative must exclude all attributes whose "ElementDefinition.type" = "Reference" in the FHIR release the resource conforms to. From the remainder attributes, the generated narrative must include only the ones whose "ElementDefinition.isSummary" = true in the FHIR release the resource conforms to.
3. For each one of the resource instances that compose the Bundle: Identify all resource attributes that may refer to a terminology (i.e., attributes where "ElementDefinition.type" = "Coding" or "ElementDefinition.type" = "CodeableConcept" in the FHIR release the resource conforms to). From these attributes, select those that don't present a "text" or a "display" and try to find the corresponding meaning for the combination of "system" and "code". Include the findings in the generated narrative.
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
							vscode.LanguageModelChatMessage.User(
								COMMON_PROMPT_FRAGMENT
								+ (jsonContent['resourceType'] === 'Bundle' ? RESOURCE_BUNDLE_PROMPT_FRAGMENT : SINGLE_RESOURCE_PROMPT_FRAGMENT)
							),
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
							let iteractionNumber = 0;
							let textDocument = null;
							for await (const fragment of chatResponse.text) {
								iteractionNumber++;
								if (iteractionNumber === 1) {
									// Create a new document with the generated content.
									textDocument = await vscode.workspace.openTextDocument({
										content: fragment,
										language: 'md'
									});
									await vscode.window.showTextDocument(
										textDocument, {
											viewColumn: vscode.ViewColumn.Beside
										}
									);
								}
								else {
									// Append the fragment to the existing document.
									if (textDocument) {
										const edit = new vscode.WorkspaceEdit();
										edit.insert(textDocument.uri, new vscode.Position(textDocument.lineCount, 0), fragment);
										await vscode.workspace.applyEdit(edit);
									}
								}
							}
							// Open the markdown preview for the document.
							if (textDocument) {
								await vscode.commands.executeCommand("markdown.showPreview", textDocument.uri);
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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable3 = vscode.commands.registerCommand('fhir-resource-diagram-viewer-vscode.analyzeContent', async () => {
		// The code you place here will be executed every time your command is executed

		// Common prompt fragment.
		const COMMON_PROMPT_FRAGMENT = `
You are a FHIR resource content analyzer.
Your task is to analyze the content of a FHIR resource, extract relevant information, and generate a report from your analysis.
The resource content is provided in JSON format.
The resulting report must be formatted using markdown syntax.
The analyses listed bellow must be executed in order. If it's not possible to execute an specific analysis, you must inform the user about the reasons.
`;
		// Prompt fragment for single resources.
		const SINGLE_RESOURCE_PROMPT_FRAGMENT = `
1. Analyze the resource content and, based on its structure, identify the FHIR release the resource conforms to. Answer only with the FHIR release and with the rationale for your choice.
2. If the resource does not contain a narrative (e.g., the "text" attribute), generate one based on its content. The generated narrative must exclude all attributes whose "ElementDefinition.type" = "Reference" in the FHIR release the resource conforms to. From the remainder attributes, the generated narrative must include only the ones whose "ElementDefinition.isSummary" = true in the FHIR release the resource conforms to.
3. Identify all resource attributes that may refer to a terminology (i.e., attributes where "ElementDefinition.type" = "Coding" or "ElementDefinition.type" = "CodeableConcept" in the FHIR release the resource conforms to). From these attributes, select those that don't present a "text" or a "display" and try to find the corresponding meaning for the combination of "system" and "code". Include the findings in the generated narrative.
`;
		// Prompt fragment for bundles.
		const RESOURCE_BUNDLE_PROMPT_FRAGMENT = `
1. Analyze the bundle content and, based on its structure, identify the FHIR release the component resources conform to. Answer only with the FHIR release and with the rationale for your choice.
2. For each one of the resource instances that compose the Bundle: If the resource instance does not contain a narrative (e.g., the "text" attribute), generate one based on its content. The generated narrative must exclude all attributes whose "ElementDefinition.type" = "Reference" in the FHIR release the resource conforms to. From the remainder attributes, the generated narrative must include only the ones whose "ElementDefinition.isSummary" = true in the FHIR release the resource conforms to.
3. For each one of the resource instances that compose the Bundle: Identify all resource attributes that may refer to a terminology (i.e., attributes where "ElementDefinition.type" = "Coding" or "ElementDefinition.type" = "CodeableConcept" in the FHIR release the resource conforms to). From these attributes, select those that don't present a "text" or a "display" and try to find the corresponding meaning for the combination of "system" and "code". Include the findings in the generated narrative.
`;

		// Retrieve the first text editor.
		const allTabGroups = vscode.window.tabGroups.all;
		if (allTabGroups.length === 0) {
			vscode.window.showErrorMessage('No editor groups open.');
			return;
		}
		const firstTabGroup = allTabGroups[0];
		const firstEditorTab = firstTabGroup.tabs[0];
		const textEditor = vscode.window.visibleTextEditors.find(editor => {
			const input = firstEditorTab.input as vscode.TabInputText;
			return editor.document.uri.toString() === input.uri.toString();
		});

		// If the editor exists, use it.
		if (textEditor) {

			// Retrieve content from the active text editor.
			const documentText = textEditor.document.getText();

			try {

				// Parse the document text as JSON.
				const jsonContent = JSON.parse(documentText);

				// Only proceed if the JSON content has a 'resourceType' key.
				if (jsonContent['resourceType']) {

					// select the 4o chat model
					let [model] = await vscode.lm.selectChatModels({
						vendor: 'copilot',
						family: 'gpt-4o'
					});
					// init the chat message
					const messages = [
						vscode.LanguageModelChatMessage.User(
							COMMON_PROMPT_FRAGMENT
							+ (jsonContent['resourceType'] === 'Bundle' ? RESOURCE_BUNDLE_PROMPT_FRAGMENT : SINGLE_RESOURCE_PROMPT_FRAGMENT)
						),
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
						let iteractionNumber = 0;
						let textDocument = null;
						for await (const fragment of chatResponse.text) {
							iteractionNumber++;
							if (iteractionNumber === 1) {
								// Create a new document with the generated content.
								textDocument = await vscode.workspace.openTextDocument({
									content: fragment,
									language: 'md'
								});
								await vscode.window.showTextDocument(
									textDocument, {
										viewColumn: vscode.ViewColumn.Beside
									}
								);
							}
							else {
								// Append the fragment to the existing document.
								if (textDocument) {
									const edit = new vscode.WorkspaceEdit();
									edit.insert(textDocument.uri, new vscode.Position(textDocument.lineCount, 0), fragment);
									await vscode.workspace.applyEdit(edit);
								}
							}
						}
						// Open the markdown preview for the document.
						if (textDocument) {
							await vscode.commands.executeCommand("markdown.showPreview", textDocument.uri);
						}
					}

				}

			} catch(e: any) {
				vscode.window.showErrorMessage(e.message);
			}
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
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
