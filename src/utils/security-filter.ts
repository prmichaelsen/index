/**
 * Security filter to prevent indexing sensitive files
 */

// Patterns for files that should never be indexed
const SENSITIVE_FILE_PATTERNS = [
  // Environment and secrets
  /\.env$/i,
  /\.env\./i,
  /\.env-.*/i,
  /secrets?\.ya?ml$/i,
  /credentials?\.ya?ml$/i,
  /\.aws\/credentials$/i,
  /\.ssh\//i,
  /\.gnupg\//i,
  
  // API keys and tokens
  /api[-_]?keys?\.json$/i,
  /tokens?\.json$/i,
  /\.npmrc$/i,
  /\.pypirc$/i,
  
  // Private keys and certificates
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.crt$/i,
  /\.cer$/i,
  /id_rsa$/i,
  /id_dsa$/i,
  /id_ecdsa$/i,
  /id_ed25519$/i,
  
  // Database and connection strings
  /database\.ya?ml$/i,
  /connection[-_]?strings?\.json$/i,
  
  // Password files
  /passwords?\.txt$/i,
  /\.password$/i,
  /\.htpasswd$/i,
  
  // Git credentials
  /\.git-credentials$/i,
  /\.netrc$/i,
  
  // Cloud provider configs
  /\.aws\/config$/i,
  /\.azure\/credentials$/i,
  /\.gcloud\//i,
  
  // Docker secrets
  /docker[-_]?secrets?/i,
  
  // Kubernetes secrets
  /secrets?\.ya?ml$/i,
  /\.kube\/config$/i
];

// Directories that should be excluded
const SENSITIVE_DIRECTORIES = [
  /node_modules\//,
  /\.git\//,
  /\.vscode\//,
  /\.idea\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.next\//,
  /\.nuxt\//,
  /vendor\//,
  /\.terraform\//,
  /\.aws\//,
  /\.ssh\//,
  /\.gnupg\//,
  /\.kube\//
];

// Content patterns that indicate sensitive data
const SENSITIVE_CONTENT_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/i,
  /password\s*[:=]\s*['"][^'"]+['"]/i,
  /secret\s*[:=]\s*['"][^'"]{20,}['"]/i,
  /token\s*[:=]\s*['"][^'"]{20,}['"]/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
  /-----BEGIN\s+CERTIFICATE-----/i
];

export interface SecurityCheckResult {
  isSafe: boolean;
  reason?: string;
  category?: 'filename' | 'directory' | 'content';
}

/**
 * Check if a file path is safe to index
 */
export function isFilePathSafe(filePath: string): SecurityCheckResult {
  // Check filename patterns
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(filePath)) {
      return {
        isSafe: false,
        reason: `File matches sensitive pattern: ${pattern}`,
        category: 'filename'
      };
    }
  }

  // Check directory patterns
  for (const pattern of SENSITIVE_DIRECTORIES) {
    if (pattern.test(filePath)) {
      return {
        isSafe: false,
        reason: `File is in sensitive directory: ${pattern}`,
        category: 'directory'
      };
    }
  }

  return { isSafe: true };
}

/**
 * Check if file content contains sensitive data
 */
export function isContentSafe(content: string): SecurityCheckResult {
  // Check for sensitive patterns in content
  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isSafe: false,
        reason: `Content contains sensitive data pattern: ${pattern}`,
        category: 'content'
      };
    }
  }

  return { isSafe: true };
}

/**
 * Comprehensive security check for file indexing
 */
export function canIndexFile(filePath: string, content?: string): SecurityCheckResult {
  // Check file path
  const pathCheck = isFilePathSafe(filePath);
  if (!pathCheck.isSafe) {
    return pathCheck;
  }

  // Check content if provided
  if (content) {
    const contentCheck = isContentSafe(content);
    if (!contentCheck.isSafe) {
      return contentCheck;
    }
  }

  return { isSafe: true };
}