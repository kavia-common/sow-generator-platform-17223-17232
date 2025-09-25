# Dev Proxy Setup (Optional)

During development, you can route frontend calls to the backend_express by adding a proxy entry in frontend_reactjs/package.json:

{
  "proxy": "http://localhost:8080"
}

This allows the app to call /api/* endpoints without setting REACT_APP_BACKEND_URL. If you prefer not to modify package.json, set:

REACT_APP_BACKEND_URL=http://localhost:8080

in your .env file instead.
