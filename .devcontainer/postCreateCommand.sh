#!/bin/bash

chown -R vscode:vscode ~

./scripts/setup.sh

# Claude Code
npm install -g @anthropic-ai/claude-code
