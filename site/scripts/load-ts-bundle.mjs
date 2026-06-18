import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs'];

function resolveModule(fromFile, specifier) {
  if (specifier.endsWith('.json')) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    if (existsSync(base)) return base;
    throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
  }

  if (!specifier.startsWith('.')) {
    throw new Error(`Unsupported import specifier: ${specifier}`);
  }

  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const ext of EXTENSIONS) {
    const candidate = base.endsWith(ext) ? base : `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
}

function stripExtension(filePath) {
  return filePath.replace(/\.(tsx?|jsx?|mjs)$/i, '');
}

function bundleTsModule(entryFile) {
  const entryPath = path.resolve(entryFile);
  const modules = new Map();

  function load(filePath) {
    const absPath = path.resolve(filePath);
    if (modules.has(absPath)) return absPath;

    if (absPath.endsWith('.json')) {
      modules.set(absPath, {
        outputText: '',
        localImports: [],
        jsonData: JSON.parse(readFileSync(absPath, 'utf8')),
      });
      return absPath;
    }

    let source = readFileSync(absPath, 'utf8');
    const localImports = [];

    source = source.replace(
      /^import\s+(type\s+)?(\w+)\s+from\s+['"](\.[^'"]+\.json)['"];?\s*$/gm,
      (_, typeKeyword, binding, specifier) => {
        if (typeKeyword) return '';
        const depPath = load(resolveModule(absPath, specifier));
        localImports.push({ names: binding, depPath, isJson: true });
        return '';
      },
    );

    source = source.replace(
      /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?\s*$/gm,
      (_, typeKeyword, names, specifier) => {
        if (typeKeyword) return '';
        const depPath = load(resolveModule(absPath, specifier));
        localImports.push({ names, depPath });
        return '';
      },
    );

    source = source.replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
    source = source.replace(/^export\s+type\s+.+;?\s*$/gm, '');
    source = source.replace(/^export\s+interface\s+\w+\s*\{[\s\S]*?\n\}\s*$/gm, '');
    source = source.replace(/^interface\s+\w+\s*\{[\s\S]*?\n\}\s*$/gm, '');

    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: absPath,
    });

    modules.set(absPath, { outputText, localImports });
    return absPath;
  }

  load(entryPath);

  const moduleVars = new Map();
  for (const absPath of modules.keys()) {
    moduleVars.set(absPath, `__mod_${moduleVars.size}`);
  }

  const lines = [];
  lines.push('const __modules = {};');

  for (const [absPath, mod] of modules) {
    const varName = moduleVars.get(absPath);
    lines.push(`${varName} = { exports: {} };`);
    lines.push(`__modules[${JSON.stringify(stripExtension(absPath))}] = ${varName};`);

    if (!mod.outputText && mod.jsonData) continue;

    for (const imp of mod.localImports) {
      if (imp.isJson) {
        const jsonData = modules.get(imp.depPath)?.jsonData;
        lines.push(`const ${imp.names} = ${JSON.stringify(jsonData)};`);
        continue;
      }

      for (const entry of imp.names.split(',')) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const [original, alias = original] = trimmed.split(/\s+as\s+/).map((part) => part.trim());
        const depVar = moduleVars.get(imp.depPath);
        lines.push(`const ${alias} = ${depVar}.exports.${original};`);
      }
    }

    lines.push(`(function (exports, module) {`);
    lines.push(mod.outputText.replace(/^export\s+/gm, ''));
    lines.push(`})(${varName}.exports, ${varName});`);
  }

  const entryVar = moduleVars.get(entryPath);
  lines.push(`module.exports = ${entryVar}.exports;`);

  const sandbox = { module: { exports: {} }, exports: {}, decodeURIComponent, URL };
  runInNewContext(lines.join('\n'), sandbox, { filename: 'bundle.js' });
  return sandbox.module.exports;
}

export function loadTsModule(entryUrl) {
  const entryFile = fileURLToPath(entryUrl);
  return bundleTsModule(entryFile);
}

export function loadTsModuleFromPath(relativePath, baseUrl = import.meta.url) {
  const entryUrl = new URL(relativePath, baseUrl);
  return loadTsModule(entryUrl);
}
