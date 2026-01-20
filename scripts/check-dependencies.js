#!/usr/bin/env node

/**
 * Check for outdated and deprecated packages
 * Exits with code 1 if any issues are found (blocks CI)
 */

const { execSync } = require('child_process');

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

let hasErrors = false;

console.log('\n📦 Checking dependencies...\n');

// Check for outdated packages
console.log('🔍 Checking for outdated packages...\n');

try {
  // pnpm outdated returns exit code 1 if there are outdated packages
  // We want to capture the output regardless
  const output = execSync('pnpm outdated --format json 2>/dev/null', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // If we get here with output, parse it
  if (output && output.trim()) {
    const outdated = JSON.parse(output);
    const packages = Object.keys(outdated);

    if (packages.length > 0) {
      console.log(`${RED}❌ Found ${packages.length} outdated package(s):${RESET}\n`);

      packages.forEach((pkg) => {
        const info = outdated[pkg];
        console.log(`  ${YELLOW}${pkg}${RESET}: ${info.current} → ${GREEN}${info.latest}${RESET}`);
      });

      console.log(`\n${YELLOW}Run 'pnpm update' or update package.json to fix.${RESET}\n`);
      hasErrors = true;
    }
  }
} catch (error) {
  // pnpm outdated exits with 1 when packages are outdated
  if (error.stdout) {
    try {
      const outdated = JSON.parse(error.stdout);
      const packages = Object.keys(outdated);

      if (packages.length > 0) {
        console.log(`${RED}❌ Found ${packages.length} outdated package(s):${RESET}\n`);

        packages.forEach((pkg) => {
          const info = outdated[pkg];
          console.log(
            `  ${YELLOW}${pkg}${RESET}: ${info.current} → ${GREEN}${info.latest}${RESET}`
          );
        });

        console.log(`\n${YELLOW}Run 'pnpm update' or update package.json to fix.${RESET}\n`);
        hasErrors = true;
      }
    } catch {
      // Not JSON, might be empty or error message
    }
  }
}

if (!hasErrors) {
  console.log(`${GREEN}✓ All packages are up to date${RESET}\n`);
}

// Check for deprecated packages
console.log('🔍 Checking for deprecated packages...\n');

try {
  // Get list of all dependencies
  const lockfileContent = execSync('pnpm list --json --depth 0 2>/dev/null', {
    encoding: 'utf-8',
  });

  const workspaces = JSON.parse(lockfileContent);
  const allDeps = new Set();

  // Collect all direct dependencies from all workspaces
  workspaces.forEach((workspace) => {
    if (workspace.dependencies) {
      Object.keys(workspace.dependencies).forEach((dep) => allDeps.add(dep));
    }
    if (workspace.devDependencies) {
      Object.keys(workspace.devDependencies).forEach((dep) => allDeps.add(dep));
    }
  });

  const deprecatedPackages = [];

  // Check each package for deprecation (check top 50 to avoid rate limiting)
  const depsToCheck = Array.from(allDeps).slice(0, 100);

  for (const pkg of depsToCheck) {
    try {
      const npmInfo = execSync(`npm view ${pkg} deprecated 2>/dev/null`, {
        encoding: 'utf-8',
      }).trim();

      if (npmInfo) {
        deprecatedPackages.push({ name: pkg, message: npmInfo });
      }
    } catch {
      // Package might not exist on npm or other error, skip
    }
  }

  if (deprecatedPackages.length > 0) {
    console.log(`${RED}❌ Found ${deprecatedPackages.length} deprecated package(s):${RESET}\n`);

    deprecatedPackages.forEach(({ name, message }) => {
      console.log(`  ${YELLOW}${name}${RESET}: ${message}`);
    });

    console.log(`\n${YELLOW}Consider replacing these packages with alternatives.${RESET}\n`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓ No deprecated packages found${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Could not check for deprecated packages${RESET}\n`);
}

// Exit with appropriate code
if (hasErrors) {
  console.log(`${RED}✗ Dependency check failed${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ All dependency checks passed${RESET}\n`);
  process.exit(0);
}
