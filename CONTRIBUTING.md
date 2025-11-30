# Contributing to OpenPolicy

Thank you for your interest in contributing to OpenPolicy! We welcome contributions from the community to help make document management and policy hosting better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Guidelines](#development-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
  - [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository** to your own GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/zakafz/openpolicy.git
   cd openpolicy
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Set up environment variables** by copying `.env.example` to `.env.local` and filling in the required values
5. **Run the development server**:
   ```bash
   pnpm dev
   ```

## How to Contribute

### Reporting Bugs

If you discover a bug, please create an issue with the following information:

- **Clear title** describing the issue
- **Detailed description** of the problem
- **Steps to reproduce** the bug
- **Expected behavior** vs. actual behavior
- **Screenshots or error logs** if applicable
- **Environment details** (browser, OS, Node version, etc.)

Before creating a new issue, please search existing issues to avoid duplicates.

### Suggesting Features

We love hearing your ideas! To suggest a new feature:

1. Check if a similar feature request already exists
2. Create a new issue with the `feature request` label
3. Provide:
   - A clear description of the feature
   - The problem it solves or value it adds
   - Any implementation ideas or examples
   - Potential use cases

### Submitting Pull Requests

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
2. **Make your changes** following our development guidelines

3. **Test your changes** thoroughly:
   ```bash
   pnpm lint
   pnpm build
   ```

4. **Commit your changes** with clear, descriptive messages

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots or demos for UI changes
   - Notes on testing performed

## Development Guidelines

### Code Style

- We use **Biome** for linting and formatting
- Run `pnpm format` before committing to ensure consistent formatting
- Run `pnpm lint` to check for linting errors
- Follow existing code patterns and conventions in the codebase
- Use TypeScript types appropriately - avoid `any` when possible
- Keep components focused and reusable

### Commit Messages

Write clear, concise commit messages that explain the "why" behind changes:

- Use present tense ("Add feature" not "Added feature")
- Keep the first line under 72 characters
- Reference issues when applicable (e.g., "Fix #123")
- For larger changes, include a detailed description in the commit body

Examples:
```
Add custom domain verification flow

Implement DNS verification for custom domains using CNAME records.
Includes UI for displaying DNS configuration and verification status.

Fixes #456
```

### Testing

- Test your changes in multiple browsers when applicable
- Verify responsive design on different screen sizes
- Ensure accessibility standards are maintained
- Test edge cases and error scenarios
- If adding new features, consider adding tests

## Community

- **Questions?** Open a discussion or issue
- **Need help?** Reach out via email at support@openpolicyhq.com
- **Want to chat?** Join our community discussions

---

Thank you for contributing to OpenPolicy! Your efforts help make policy and document management accessible to everyone.
