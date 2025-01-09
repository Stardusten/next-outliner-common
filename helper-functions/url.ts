export const normalizeServerUrl = (url: string) => {
  // add protocol if not exists
  // localhost:8080 -> https://localhost:8080
  // http://localhost:8080 -> http://localhost:8080 (unchange)
  // https://localhost:8080 -> https://localhost:8080 (unchange)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};
