# Lemur Documentation Contribution Guide

## Introduction

Thank you for your interest in contributing to the Lemur documentation! This guide will help you understand how to effectively contribute documentation to the Lemur search engine project.

## Documentation Structure

The Lemur documentation is organized into the following main sections:

- **API**: API reference and examples for integrating with Lemur
- **Architecture**: System design and technical architecture documents
- **Design**: Design specifications, color schemes, and UI guidelines
- **Development**: Developer guides, product requirements, and planning documents
- **Protocols**: Integration specifications for MCP and A2A protocols

## Contributing Process

### 1. Choose What to Document

Before writing documentation, identify what needs to be documented:

- New features or functionality
- Updates to existing features
- Best practices or how-to guides
- API changes or additions
- Bug fixes or workarounds

### 2. Creating or Updating Documentation

Follow these steps to contribute documentation:

1. **Fork the Repository**: Start by forking the Lemur repository
2. **Create a Branch**: Create a new branch for your documentation changes
3. **Make Changes**: Add or update documentation files in the appropriate section
4. **Generate TOC**: Run `node docs/scripts/generate-toc.js` to update the table of contents
5. **Submit a Pull Request**: Create a PR with your changes

### 3. Documentation Standards

#### File Naming

- Use kebab-case for file names (e.g., `api-reference.md`, `color-scheme.md`)
- Be descriptive but concise in naming

#### Markdown Formatting

- Use Markdown formatting consistently
- Start files with a level-1 heading (`# Title`)
- Use appropriate heading levels (avoid skipping levels)
- Use code blocks with language specification for code examples
- Include links to related documentation when relevant

#### Content Guidelines

- Be clear and concise
- Use simple language and avoid jargon when possible
- Include examples when appropriate
- Explain the "why" along with the "how"
- Keep documentation up-to-date with code changes

## Documentation Types

### Conceptual Documentation

Explains concepts, architecture, and design decisions:

- High-level overviews
- Architecture diagrams
- Design principles
- Integration patterns

### Procedural Documentation

Provides step-by-step instructions:

- How-to guides
- Tutorials
- Installation instructions
- Configuration guides

### Reference Documentation

Provides detailed technical information:

- API references
- Configuration options
- Parameter definitions
- Error codes and resolution

## Maintaining Documentation

### Version Control

- Document changes should be versioned alongside code changes
- Include documentation updates in the same PR as code changes when possible
- For major documentation-only changes, create separate PRs

### Review Process

- Documentation PRs will be reviewed for technical accuracy and clarity
- Feedback may include suggestions for organization, formatting, or content
- Address review comments before documentation is merged

## Tools and Resources

### Documentation Generation

- Table of Contents: `node docs/scripts/generate-toc.js`
- Use appropriate diagrams when needed (PlantUML, Mermaid, etc.)

### Style Guide

- Follow the [Google Developer Documentation Style Guide](https://developers.google.com/style) for general writing
- API documentation should follow [OpenAPI Specification](https://swagger.io/specification/) conventions

## Getting Help

If you have questions about contributing to the documentation:

- Open an issue with the "documentation" label
- Reach out to the documentation team
- Check existing documentation for examples

## Thank You

Your contributions to the Lemur documentation help make the project more accessible and usable for everyone. Thank you for your efforts to improve the documentation!