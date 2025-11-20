const readFromImportMeta = (key: string): string | undefined => {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> })
      .env;
    if (env && key in env) {
      const value = env[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  } catch {
    // import.meta is not defined in every runtime
  }

  return undefined;
};

const readFromProcessEnv = (key: string): string | undefined => {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
};

export function getEnvVar(key: string, fallback?: string) {
  return readFromImportMeta(key) ?? readFromProcessEnv(key) ?? fallback;
}
