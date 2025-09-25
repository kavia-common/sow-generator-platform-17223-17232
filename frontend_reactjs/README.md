# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

IMPORTANT: OpenAI is not supported in this deployment. All AI features use the local backend_express API.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify

## Getting Started

Environment variables:
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (optional; redirect for email sign-in links)
- REACT_APP_BACKEND_URL (optional; e.g. http://localhost:8080 when not using a dev proxy)

Dev proxy (optional): add `"proxy": "http://localhost:8080"` to package.json to forward `/api/*` to backend_express in development.

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).
