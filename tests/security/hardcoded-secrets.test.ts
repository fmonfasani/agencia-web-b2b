import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { describe, expect, it } from "vitest";

const DANGEROUS_PATTERNS = [
  {
    pattern: /366bbcdceecb8723e8de206c2e0cc7b5/g,
    severity: "CRITICAL",
    description: "Hardcoded fallback secret found",
  },
  {
    pattern: /api[_-]?key["\s]*[:=]["\s]*["'][A-Za-z0-9_-]{32,}["']/gi,
    severity: "CRITICAL",
    description: "Potential hardcoded API key",
  },
  {
    pattern: /Bearer [A-Za-z0-9_-]{32,}/g,
    severity: "HIGH",
    description: "Exposed Bearer token in code",
  },
];

const EXCLUDED_PATHS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
  "venv",
  "__pycache__",
  "tests",
  "e2e",
];

const EXCLUDED_EXTENSIONS = [".json"];

function scanFile(
  filePath: string,
  content: string,
): Array<{
  pattern: (typeof DANGEROUS_PATTERNS)[0];
  line: number;
  lineContent: string;
}> {
  const lines = content.split("\n");
  const findings: Array<{
    pattern: (typeof DANGEROUS_PATTERNS)[0];
    line: number;
    lineContent: string;
  }> = [];

  lines.forEach((line, index) => {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.pattern.test(line)) {
        findings.push({
          pattern,
          line: index + 1,
          lineContent: line.trim().substring(0, 100),
        });
        pattern.pattern.lastIndex = 0;
      }
    }
  });

  return findings;
}

function scanDirectory(
  dir: string,
): Array<{ file: string; findings: ReturnType<typeof scanFile> }> {
  const results: Array<{
    file: string;
    findings: ReturnType<typeof scanFile>;
  }> = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          !EXCLUDED_PATHS.includes(entry.name) &&
          !entry.name.startsWith(".")
        ) {
          results.push(...scanDirectory(fullPath));
        }
      } else if (
        [".ts", ".tsx", ".js", ".jsx", ".env"].includes(extname(entry.name))
      ) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const findings = scanFile(fullPath, content);
          if (findings.length > 0) {
            results.push({ file: fullPath, findings });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results;
}

describe("Security: Hardcoded Secrets Scanner", () => {
  const results = scanDirectory(process.cwd());

  it("SCAN: No critical hardcoded secrets in codebase", () => {
    const criticalFindings = results.filter((r) =>
      r.findings.some((f) => f.pattern.severity === "CRITICAL"),
    );

    if (criticalFindings.length > 0) {
      console.error("\n🚨 CRITICAL: Hardcoded secrets found:");
      for (const result of criticalFindings) {
        console.error(`\n📁 ${result.file}`);
        for (const finding of result.findings) {
          if (finding.pattern.severity === "CRITICAL") {
            console.error(
              `   Line ${finding.line}: ${finding.pattern.description}`,
            );
            console.error(`   Code: ${finding.lineContent}`);
          }
        }
      }
    }

    expect(criticalFindings).toHaveLength(0);
  });

  it("SCAN: No high-severity hardcoded secrets in codebase", () => {
    const highFindings = results.filter((r) =>
      r.findings.some((f) => f.pattern.severity === "HIGH"),
    );

    if (highFindings.length > 0) {
      console.warn("\n⚠️ WARNING: Potential secrets found:");
      for (const result of highFindings) {
        console.warn(`\n📁 ${result.file}`);
        for (const finding of result.findings) {
          if (finding.pattern.severity === "HIGH") {
            console.warn(
              `   Line ${finding.line}: ${finding.pattern.description}`,
            );
          }
        }
      }
    }

    expect(highFindings).toHaveLength(0);
  });
});
