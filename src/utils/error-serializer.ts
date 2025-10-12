/**
 * Serializes an error object, removing circular references and extracting useful information
 */
export function serializeError(error: unknown): any {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      value: String(error)
    };
  }

  const serialized: any = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Extract additional properties from the error object
  const errorObj = error as any;
  for (const key of Object.keys(errorObj)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      try {
        // Attempt to serialize the property
        serialized[key] = JSON.parse(JSON.stringify(errorObj[key]));
      } catch {
        // If it fails (circular reference), just store the string representation
        serialized[key] = String(errorObj[key]);
      }
    }
  }

  return serialized;
}