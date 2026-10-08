import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Every exported Server Action in src/app/backoffice/** /action.ts must
 * check who's calling — requireStaff / requireOwner / requirePermission
 * (lib/access/roleGuard.ts) — so a new action can't quietly skip it.
 *
 * Why a static scan (and not, say, a GUARDS record each file exports):
 * a "use server" file may only export async functions — exporting an
 * object from it breaks the build — so the rule is checked from the
 * source instead. Each action.ts is parsed with the TypeScript compiler
 * (not regexes), and for every `export async function` the scan follows
 * the module's own top-level helpers the action REFERENCES — called
 * (`safeX(id)`) or passed along (`.asyncAndThen(safeX)`) — through any
 * depth (e.g. action → safe function → resolveLocation helper). The
 * action counts as guarded when that reachable code calls a guard.
 * Adding an exported action without one makes this test fail.
 */

const GUARDS = new Set(["requireStaff", "requireOwner", "requirePermission"]);

/** Names of the exported actions in `source` that never reach a guard. */
function unguardedActions(source: string, fileName = "action.ts"): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);

  // Top-level functions and consts (e.g. `const safeX = toSafeResult(...)`).
  const topLevel = new Map<string, ts.Node>();
  const exportedActions: string[] = [];
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      topLevel.set(statement.name.text, statement);
      const isExported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (isExported) exportedActions.push(statement.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          topLevel.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }

  function reachesGuard(node: ts.Node, visited: Set<string>): boolean {
    let found = false;
    const visit = (child: ts.Node) => {
      if (found) return;
      if (
        ts.isCallExpression(child) &&
        ts.isIdentifier(child.expression) &&
        GUARDS.has(child.expression.text)
      ) {
        found = true;
        return;
      }
      if (ts.isIdentifier(child) && topLevel.has(child.text) && !visited.has(child.text)) {
        visited.add(child.text);
        if (reachesGuard(topLevel.get(child.text)!, visited)) {
          found = true;
          return;
        }
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return found;
  }

  return exportedActions.filter(
    (name) => !reachesGuard(topLevel.get(name)!, new Set([name])),
  );
}

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return actionFiles(path);
    return entry === "action.ts" ? [path] : [];
  });
}

const BACKOFFICE = join(process.cwd(), "src/app/backoffice");

describe("every Backoffice Server Action checks who is calling", () => {
  const files = actionFiles(BACKOFFICE);

  it("finds the action files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((path) => [relative(BACKOFFICE, path), path]))(
    "%s: every exported action reaches requireStaff / requireOwner / requirePermission",
    (_name, path) => {
      expect(unguardedActions(readFileSync(path, "utf8"), path)).toEqual([]);
    },
  );
});

describe("the guard scan itself", () => {
  it("accepts a guard inside a safe function passed to asyncAndThen", () => {
    const source = `
      const safeDo = toSafeResult(async () => { await requireOwner(); });
      export async function doAction(input) {
        return validateWith(schema, input).asyncAndThen(safeDo);
      }`;
    expect(unguardedActions(source)).toEqual([]);
  });

  it("accepts a guard two helpers deep", () => {
    const source = `
      async function resolve() { return requirePermission("REPORTS_VIEW"); }
      const safeDo = toSafeResult(async () => resolve());
      export async function doAction() { return safeDo(); }`;
    expect(unguardedActions(source)).toEqual([]);
  });

  it("flags an exported action that never reaches a guard", () => {
    const source = `
      const safeDo = toSafeResult(async () => { await getSessionContext(); });
      export async function guarded() { await requireStaff(); }
      export async function forgotten() { return safeDo(); }`;
    expect(unguardedActions(source)).toEqual(["forgotten"]);
  });

  it("isn't fooled by a guard that is only mentioned, not called", () => {
    const source = `
      // requireOwner() should be called here
      export async function forgotten() { const name = "requireOwner"; return name; }`;
    expect(unguardedActions(source)).toEqual(["forgotten"]);
  });
});
