#!/bin/bash
cd /home/kavia/workspace/code-generation/sow-generator-platform-17223-17232/frontend_reactjs
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

