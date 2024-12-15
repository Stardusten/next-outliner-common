import { getPlatform } from "./platform";

export const getSeperator = () => {
  const platform = getPlatform();
  return platform === "win32" ? "\\" : "/";
};

export const getPathSegments = (path: string) => {
  return path.split(getSeperator());
};

export const joinPathSegments = (segments: string[]) => {
  const seperator = getSeperator();
  const normalizedSegments = [];
  for (const segment of segments) {
    let segment2 = segment;
    if (segment2.startsWith(seperator)) segment2 = segment2.slice(1);
    if (segment2.endsWith(seperator)) segment2 = segment2.slice(0, -1);
    if (segment2.length === 0) continue;
    normalizedSegments.push(segment2);
  }
  return normalizedSegments.join(seperator);
};

export const isAbsolutePath = (path: string) => {
  const platform = getPlatform();
  if (platform === "win32") {
    // 以 \ 或 盘符 开头
    return path.startsWith("\\") || path.match(/^[A-Za-z]:\\/);
  }
  // 以 / 开头
  return path.startsWith("/");
};

export const getBasename = (path: string) => {
  const segments = getPathSegments(path);
  return segments[segments.length - 1];
};

export const getRelativePath = (basePath: string, targetPath: string) => {
  const baseSegments = getPathSegments(basePath);
  const targetSegments = getPathSegments(targetPath);

  // Check if targetPath is a subpath of basePath
  if (targetSegments.length < baseSegments.length) {
    return null;
  }

  for (let i = 0; i < baseSegments.length; i++) {
    if (baseSegments[i] !== targetSegments[i]) {
      return null;
    }
  }

  // Calculate the number of directories to go up from the base path
  const upSegments = baseSegments.slice(baseSegments.length).map(() => "..");

  // Add the remaining target path segments
  const downSegments = targetSegments.slice(baseSegments.length);

  // Join the segments to form the relative path
  return joinPathSegments([...upSegments, ...downSegments]);
};
