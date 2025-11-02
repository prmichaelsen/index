/**
 * Utility for detecting file metadata from extensions and content
 */

export interface FileMetadata {
  language: string;
  contentType: string;
  framework: string;
}

// Language detection by extension
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.xml': 'xml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'config'
};

/**
 * Detect file metadata from extension, filename, and content
 */
export function detectFileMetadata(
  ext: string,
  fileName: string,
  content: string
): FileMetadata {
  let language = '';
  let contentType = 'code';
  let framework = '';

  // Detect language from extension
  language = EXTENSION_TO_LANGUAGE[ext.toLowerCase()] || '';

  // Detect content type from filename patterns
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('test') || lowerFileName.includes('spec') || lowerFileName.includes('.test.') || lowerFileName.includes('.spec.')) {
    contentType = 'test';
  } else if (lowerFileName === 'readme.md' || lowerFileName === 'readme') {
    contentType = 'readme';
  } else if (['.md', '.txt', '.doc', '.rst'].includes(ext.toLowerCase())) {
    contentType = 'documentation';
  } else if (['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config'].includes(ext.toLowerCase())) {
    contentType = 'configuration';
  } else if (['.sh', '.bash', '.ps1', '.bat', '.cmd'].includes(ext.toLowerCase())) {
    contentType = 'script';
  } else if (lowerFileName.includes('schema') || lowerFileName.includes('migration')) {
    contentType = 'schema';
  } else if (lowerFileName.includes('api') && ['.yaml', '.yml', '.json'].includes(ext.toLowerCase())) {
    contentType = 'api-spec';
  }

  // Detect framework from content (simple heuristics)
  framework = detectFramework(content);

  return { language, contentType, framework };
}

/**
 * Detect framework from file content
 */
export function detectFramework(content: string): string {
  // React
  if (content.includes('import React') || content.includes('from \'react\'') || content.includes('from "react"')) {
    return 'React';
  }
  
  // Vue
  if (content.includes('import Vue') || content.includes('from \'vue\'') || content.includes('from "vue"')) {
    return 'Vue';
  }
  
  // Angular
  if (content.includes('@angular/') || content.includes('from \'@angular')) {
    return 'Angular';
  }
  
  // Svelte
  if (content.includes('<script') && content.includes('</script>') && content.includes('<style')) {
    return 'Svelte';
  }
  
  // Django
  if (content.includes('from django') || content.includes('import django')) {
    return 'Django';
  }
  
  // Flask
  if (content.includes('from flask') || content.includes('import flask')) {
    return 'Flask';
  }
  
  // FastAPI
  if (content.includes('from fastapi') || content.includes('import fastapi')) {
    return 'FastAPI';
  }
  
  // Express
  if (content.includes('import express') || content.includes('from \'express\'') || content.includes('require(\'express\')')) {
    return 'Express';
  }
  
  // NestJS
  if (content.includes('@nestjs/') || content.includes('from \'@nestjs')) {
    return 'NestJS';
  }
  
  // Spring
  if (content.includes('org.springframework') || content.includes('import org.springframework')) {
    return 'Spring';
  }
  
  // Spring Boot
  if (content.includes('org.springframework.boot')) {
    return 'Spring Boot';
  }
  
  // Next.js
  if (content.includes('next/') || content.includes('from \'next')) {
    return 'Next.js';
  }
  
  // Nuxt
  if (content.includes('nuxt') || content.includes('from \'nuxt')) {
    return 'Nuxt';
  }

  return '';
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'python': 'Python',
    'java': 'Java',
    'go': 'Go',
    'rust': 'Rust',
    'cpp': 'C++',
    'csharp': 'C#',
    'ruby': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'scala': 'Scala',
    'shell': 'Shell',
    'sql': 'SQL',
    'html': 'HTML',
    'css': 'CSS',
    'yaml': 'YAML',
    'json': 'JSON',
    'markdown': 'Markdown'
  };
  
  return displayNames[language] || language;
}