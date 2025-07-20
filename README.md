# fhir-resource-diagram-viewer-vscode
A VS Code extension for analyzing FHIR® resource instances using an LLM and viewing their content as diagrams.

## Dependencies
[PlantUML extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) - for generating and previewing diagrams  
[GitHub Copilot](https://github.com/features/copilot) - for analyzing resource contents using an LLM  

### About GitHub Copilot
1. You must [set up GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/setup) for using the LLM-based analysis feature.
2. Stay alert to the [GitHub Copilot usage limits](https://docs.github.com/en/copilot/concepts/copilot-billing/about-individual-copilot-plans-and-benefits) that may restrict the use of the LLM-based analysis feature.

## Usage
1. Open up a JSON file with the resource content.
2. Execute one of the extension commands by using the Command Palette ("View/Command Palette..." or Ctrl+Shift+P).
    * "fhir-resource-diagram-viewer-vscode: View the resource content as a diagram" (for viewing all attributes).
    * "fhir-resource-diagram-viewer-vscode: View resource references as a diagram" (for viewing the "resourceType" attribute, the "id" attribute, and attributes with references).
    * "fhir-resource-diagram-viewer-vscode: Analyze the resource content using an LLM" (for analyzing the resource content using GitHub Copilot).
3. View the PlantUML code and diagram generated from the original content or the resulting analysis from the LLM.

![Extension usage](resources/images/extension_usage.gif)

![Extension usage](resources/images/extension_usage_llm.gif)

## Release Notes

### 1.1.0

- Refactored the diagram generation.
- Added command for analyzing resource contents using an LLM.

### 1.0.0

- Initial release.
