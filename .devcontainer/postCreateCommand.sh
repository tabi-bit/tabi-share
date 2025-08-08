#!/bin/bash

sudo chown -R vscode:vscode ~

./scripts/setup.sh

# Claude Code
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli
