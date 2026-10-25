import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

function resolveWithExtensions(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Handle Next.js subpath imports in Node ESM test runner
  if (specifier === 'next/link') {
    return nextResolve('next/link.js', context);
  }
  if (specifier === 'next/navigation') {
    return nextResolve('next/navigation.js', context);
  }
  if (specifier === 'next/image') {
    return nextResolve('next/image.js', context);
  }

  // 1. Handle Next.js @/* path alias -> src/*
  if (specifier.startsWith('@/')) {
    const targetPath = path.join(SRC_DIR, specifier.slice(2));
    const resolved = resolveWithExtensions(targetPath);
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  // 2. Handle relative imports without file extensions (.ts / .tsx)
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const targetPath = path.resolve(parentDir, specifier);
    const resolved = resolveWithExtensions(targetPath);
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const transpiled = ts.transpileModule(source, {
      fileName: filePath,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });

    return {
      format: 'module',
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
