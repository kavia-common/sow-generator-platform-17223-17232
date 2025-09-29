export const getURL = () => {
  let url =
    process.env.REACT_APP_SITE_URL ||
    window.location.origin ||
    'http://localhost:3000';

  // Ensure URL starts with http/https
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  // Ensure URL ends with /
  if (!url.endsWith('/')) {
    url = `${url}/`;
  }

  return url;
};
