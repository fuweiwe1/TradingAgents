/**
 * Documentation Utilities
 *
 * Provides access to built-in documentation that Claude can reference
 * when performing configuration tasks (sources, agents, permissions, etc.).
 *
 * Docs are stored under the active instance's config directory and synced from bundled assets.
 * Source content lives in apps/electron/resources/docs/*.md for easier editing.
 */

import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { CONFIG_DIR } from '../config/paths.ts';
import { getBundledAssetsDir } from '../utils/paths.ts';
import { debug } from '../utils/debug.ts';

export const DOCS_DIR = join(CONFIG_DIR, 'docs');

// Track if docs have been initialized this session (prevents re-init on hot reload)
let docsInitialized = false;

// Resolve the bundled docs assets directory using the shared asset resolver.
// Handles all environments: dev (resources/docs), bundled (dist/resources/docs),
// and packaged Electron (setBundledAssetsRoot sets the base path at startup).
function getAssetsDir(): string {
  return getBundledAssetsDir('docs')
    // Fallback: development path (will fail gracefully if files don't exist)
    ?? join(process.cwd(), 'resources', 'docs');
}

/**
 * Load bundled docs from asset files.
 * Called once at module initialization.
 * Returns empty strings if files don't exist (graceful degradation).
 */
function loadBundledDocs(): Record<string, string> {
  const assetsDir = getAssetsDir();
  const docs: Record<string, string> = {};

  // Auto-discover all files in the bundled docs directory.
  // No hardcoded list — any file dropped into resources/docs/ is synced automatically.
  let files: string[];
  try {
    files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
  } catch {
    console.warn(`[docs] Could not read assets dir: ${assetsDir}`);
    return docs;
  }

  for (const filename of files) {
    const filePath = join(assetsDir, filename);
    try {
      docs[filename] = readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`[docs] Failed to load ${filename}:`, error);
    }
  }

  return docs;
}

// Lazy-loaded bundled docs cache.
// IMPORTANT: Must NOT load at module initialization because setBundledAssetsRoot()
// hasn't been called yet. Loading eagerly causes empty docs on fresh install.
let _bundledDocs: Record<string, string> | null = null;

/**
 * Get bundled docs, loading them lazily on first access.
 * This ensures docs are loaded AFTER setBundledAssetsRoot() has been called.
 */
function getBundledDocs(): Record<string, string> {
  if (_bundledDocs === null) {
    _bundledDocs = loadBundledDocs();
  }
  return _bundledDocs;
}

/**
 * Get the docs directory path
 */
export function getDocsDir(): string {
  return DOCS_DIR;
}

/**
 * Get path to a specific doc file
 */
export function getDocPath(filename: string): string {
  return join(DOCS_DIR, filename);
}

// App root path reference used by prompts and tool descriptions.
export const APP_ROOT = CONFIG_DIR;

/**
 * Documentation file references for use in error messages and tool descriptions.
 * Use these constants instead of hardcoding paths to keep references in sync.
 */
export const DOC_REFS = {
  sources: join(DOCS_DIR, 'sources.md'),
  permissions: join(DOCS_DIR, 'permissions.md'),
  skills: join(DOCS_DIR, 'skills.md'),
  themes: join(DOCS_DIR, 'themes.md'),
  statuses: join(DOCS_DIR, 'statuses.md'),
  labels: join(DOCS_DIR, 'labels.md'),
  toolIcons: join(DOCS_DIR, 'tool-icons.md'),
  automations: join(DOCS_DIR, 'automations.md'),
  hooks: join(DOCS_DIR, 'automations.md'),
  tasks: join(DOCS_DIR, 'automations.md'),
  mermaid: join(DOCS_DIR, 'mermaid.md'),
  dataTables: join(DOCS_DIR, 'data-tables.md'),
  htmlPreview: join(DOCS_DIR, 'html-preview.md'),
  pdfPreview: join(DOCS_DIR, 'pdf-preview.md'),
  imagePreview: join(DOCS_DIR, 'image-preview.md'),
  markdownPreview: join(DOCS_DIR, 'markdown-preview.md'),
  llmTool: join(DOCS_DIR, 'llm-tool.md'),
  browserTools: join(DOCS_DIR, 'browser-tools.md'),
  craftCli: join(DOCS_DIR, 'craft-cli.md'),
  docsDir: DOCS_DIR,
} as const;

/**
 * Check if docs directory exists
 */
export function docsExist(): boolean {
  return existsSync(DOCS_DIR);
}

/**
 * List available doc files
 */
export function listDocs(): string[] {
  if (!existsSync(DOCS_DIR)) return [];
  return readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
}

/**
 * Initialize docs directory with bundled documentation.
 * Always writes all docs on launch to ensure consistency across debug and release modes.
 */
export function initializeDocs(): void {
  // Skip if already initialized this session (prevents re-init on hot reload)
  if (docsInitialized) {
    return;
  }
  docsInitialized = true;

  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }

  // Load bundled docs lazily (after setBundledAssetsRoot has been called)
  const bundledDocs = getBundledDocs();

  // Always write bundled docs to disk on launch.
  // This ensures consistent behavior between debug and release modes —
  // docs are always up-to-date with the running version.
  for (const [filename, content] of Object.entries(bundledDocs)) {
    const docPath = join(DOCS_DIR, filename);
    writeFileSync(docPath, content, 'utf-8');
  }

  debug(`[docs] Synced ${Object.keys(bundledDocs).length} docs`);
}

// Export the lazy getter for external access
export { getBundledDocs };

// Re-export source guides utilities (parsing only - bundled guides removed)
export {
  parseSourceGuide,
  getSourceGuide,
  getSourceGuideForDomain,
  getSourceKnowledge,
  extractDomainFromSource,
  extractDomainFromUrl,
  type ParsedSourceGuide,
  type SourceGuideFrontmatter,
} from './source-guides.ts';

// Re-export doc links (for UI help popovers)
export {
  getDocUrl,
  getDocInfo,
  DOCS,
  type DocFeature,
  type DocInfo,
} from './doc-links.ts';
