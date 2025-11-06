#!/usr/bin/env node
// esbuild configuration for bundling the CLI application
import { build } from 'esbuild';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Copies templates and assets to the bundle directory
 */
async function copyAssets() {
  const bundleDir = join(__dirname, 'dist-bundle');
  await fs.mkdir(bundleDir, { recursive: true });
  
  // Copy templates
  const templatesSrc = join(__dirname, 'bin/templates');
  const templatesDest = join(bundleDir, 'templates');
  try {
    await fs.cp(templatesSrc, templatesDest, { recursive: true });
    console.log('✅ Copied templates');
  } catch (error) {
    console.warn('⚠️  Could not copy templates:', error.message);
  }
  
  // Copy assets
  const assetsSrc = join(__dirname, 'bin/assets');
  const assetsDest = join(bundleDir, 'assets');
  try {
    await fs.cp(assetsSrc, assetsDest, { recursive: true });
    console.log('✅ Copied assets');
  } catch (error) {
    console.warn('⚠️  Could not copy assets:', error.message);
  }
  
  // Copy instructions.txt
  const instructionsSrc = join(__dirname, 'bin/instructions.txt');
  const instructionsDest = join(bundleDir, 'instructions.txt');
  try {
    await fs.copyFile(instructionsSrc, instructionsDest);
    console.log('✅ Copied instructions.txt');
  } catch (error) {
    console.warn('⚠️  Could not copy instructions.txt:', error.message);
  }
}

/**
 * Builds the CLI application using esbuild
 * @param {Object} options - Build options
 * @param {string} options.outfile - Output file path
 * @param {boolean} options.minify - Whether to minify the output
 */
async function buildApp(options = {}) {
  const {
    outfile = join(__dirname, 'dist-bundle/index.cjs'),
    minify = false,
  } = options;

  try {
    // Ensure output directory exists
    const outDir = dirname(outfile);
    await fs.mkdir(outDir, { recursive: true });
    
    // Copy assets first
    await copyAssets();
    
    // Bundle the application as CommonJS for better pkg compatibility
    const result = await build({
      entryPoints: ['bin/index.js'],
      bundle: true,
      outfile,
      platform: 'node',
      target: 'node20',
      format: 'cjs', // Use CommonJS for better pkg compatibility
      mainFields: ['module', 'main'],
      sourcemap: false,
      minify,
      treeShaking: true,
      // Bundle all npm packages, but keep node: built-ins external (pkg will include Node.js)
      // Don't use packages: 'external' - we want to bundle everything
      logLevel: 'info',
      metafile: true,
    });

    // Add shebang to the bundled file
    const bundledContent = await fs.readFile(outfile, 'utf8');
    const shebangContent = '#!/usr/bin/env node\n';
    // Only add if not already present
    if (!bundledContent.startsWith('#!/usr/bin/env node')) {
      await fs.writeFile(outfile, shebangContent + bundledContent);
    }

    console.log('✅ Bundle completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const minify = args.includes('--minify');
  
  buildApp({ minify }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { buildApp };

