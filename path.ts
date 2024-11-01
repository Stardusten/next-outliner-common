import { getPlatform } from "./platform";

export const getSeperator = () => {
  const platform = getPlatform();
  return platform === "win32" ? "\\" : "/";
}

export const getPathSegments = (path: string) => {
  return path.split(getSeperator());
}

export const joinPathSegments = (segments: string[]) => {
  const seperator = getSeperator();
  const normalizedSegments = [];
  for (const segment of segments) {
    let segment2 = segment;
    if (segment2.startsWith(seperator))
      segment2 = segment2.slice(1);
    if (segment2.endsWith(seperator))
      segment2 = segment2.slice(0, -1);
    if (segment2.length === 0) continue;
    normalizedSegments.push(segment2);
  }
  return normalizedSegments.join(seperator);
}

export const isAbsolutePath = (path: string) => {
  const platform = getPlatform();
  if (platform === "win32") {
    // 以 \ 或 盘符 开头
    return path.startsWith("\\") || path.match(/^[A-Za-z]:\\/);
  }
  // 以 / 开头
  return path.startsWith("/");
}
