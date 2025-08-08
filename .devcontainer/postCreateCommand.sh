#!/bin/bash

sudo chown -R vscode:vscode ~

./scripts/setup.sh

# Claude Code
npm install -g @anthropic-ai/claude-code
uv tool install claude-monitor
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)

# Gemini CLI
npm install -g @google/gemini-cli
