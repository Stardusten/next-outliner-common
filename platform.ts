type Platform = "win32" | "macos" | "linux";

export const getPlatform = (): Platform => {
  // Check if running in Node.js environment
  if (typeof process !== 'undefined' && process.platform) {
    switch (process.platform) {
      case 'win32':
        return 'win32';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        throw new Error('Unsupported platform');
    }
  }

  // Check if running in browser environment
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      return 'win32';
    } else if (platform.includes('mac')) {
      return 'macos';
    } else if (platform.includes('linux')) {
      return 'linux';
    } else {
      throw new Error('Unsupported platform');
    }
  }

  throw new Error('Platform detection failed');
}