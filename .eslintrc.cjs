/* eslint-env node */
// Hand-authored, NOT Catalyst-generated. Catalyst regenerates `Makefile` and the banner-carrying
// `make/*.mk` fragments listed in `.catalyst-data.yaml`; it has never written an ESLint config
// into a consuming project, so this file is safe to hand-edit and will not be overwritten.
//
// `make/55-lint.mk` invokes `eslint --config $(CATALYST_ESLINT_CONFIG) ... .` from the repo root.
// ESLint 8 is in eslintrc mode here (no `eslint.config.js` in cwd or above it), and in that mode
// `--config` is ADDITIVE: the file it names is merged on top of the `.eslintrc.*` cascade rather
// than replacing it. So this file layers a project-specific rule onto the Catalyst ruleset
// without touching either the generated makefile fragment or the config inside `node_modules`.
//
// `import/no-restricted-paths` comes from `eslint-plugin-import`, which the Catalyst config
// already pulls in via `extends: ['standard']` (it configures `import/export` and
// `import/extensions` itself). `plugins: ['import']` is restated below so this file is
// self-sufficient rather than silently dependent on that; eslintrc tolerates the duplicate.

const path = require('node:path')

// Directory names under `src/`, one per in-tree component. NOT the manifest component names:
// `package.json`'s `plugable.host.builtins[0].components` calls the third one `issues-github`,
// while its directory is `integrations-issues-github`. Listed in the declared load order so this
// array reads against that one; order is irrelevant to the rule itself.
//
// Adding an eighth component means adding it here. `src/lib/test/component-boundary.test.js`
// asserts this list equals the actual set of component directories, so a forgotten entry fails
// the test rather than silently going unenforced.
const COMPONENT_DIRS = [
  'credentials',
  'projects',
  'orgs',
  'controls',
  'integrations-issues-github',
  'work',
  'projects-audit'
]

// One zone per component: "files under `src/<c>/` may not import anything under any *other*
// `src/<other>/`". Two properties of `import/no-restricted-paths` make this exactly right:
//
// 1. It matches on the RESOLVED absolute path of the import target, not on the specifier text.
//    That is essential here, because component names recur as ordinary nested directory names:
//    `src/controls/handlers/orgs/`, `src/controls/handlers/orgs/controls/`, and
//    `src/work/handlers/projects/` all exist. A specifier-glob rule (`no-restricted-imports`
//    with `patterns`) would flag `src/controls/handlers/index.js`'s legitimate
//    `export * from './orgs'`. This one does not.
// 2. Zones only apply to files inside their own `target`. `src/lib/builtin-plugins.mjs` is not
//    inside any component directory, so no zone matches it and its seven aggregation imports are
//    exempt structurally -- there is no allowlist to maintain, and the same holds for
//    `src/lib/test/builtin-plugins.test.js` and anything else under `src/lib/` or `src/cli/`.
//
// `target`/`from` must stay plain directory paths, never globs. The rule switches to minimatch
// semantics the moment `is-glob` says any `from` entry is a glob, and a zone mixing the two
// degrades to `isPathRestricted: () => true` -- every import in the zone reported.
const zones = COMPONENT_DIRS.map((component) => ({
  target  : path.join('src', component),
  from    : COMPONENT_DIRS.filter((other) => other !== component).map((other) => path.join('src', other)),
  message : `Cross-component import: 'src/${component}/' may not reach into a sibling component. `
    + 'Components share one package but not one namespace; they couple only through runtime '
    + 'app.ext state and the capabilities declared in package.json\'s '
    + 'plugable.host.builtins[0].components, never through module paths. Shared code belongs in '
    + 'an @liquid-labs/* library imported by bare specifier.'
}))

module.exports = {
  // Stops the cascade at the repo root so a stray `.eslintrc.*` in a developer's parent
  // directory cannot alter this project's lint. Does not affect `--config`, which ESLint applies
  // independently of the cascade.
  root    : true,
  plugins : ['import'],
  rules   : {
    // `basePath` is `__dirname`, not the default `process.cwd()`: the zone paths must mean the
    // same thing whether `eslint` is invoked from the repo root (as `make lint` does) or from a
    // subdirectory or an editor integration.
    'import/no-restricted-paths' : ['error', { basePath : __dirname, zones }]
  },
  overrides : [
    {
      // Jest globals (`describe`, `test`, `beforeAll`, `expect`, ...) for the unit-test tree.
      // Most files here already self-document their globals via a per-file
      // `/* global ... */` comment, but that convention is opt-in and easy to under-declare (a
      // file can add a new `beforeAll`/`afterEach` call without updating its own comment) --
      // `env: { jest }` (built into ESLint core, no plugin required) recognizes the whole Jest
      // global set for this directory so a missed per-file declaration can't surface as a
      // false-positive `no-undef` finding.
      files : ['src/lib/test/**/*.js'],
      env   : { jest : true }
    }
  ]
}

// Named export, alongside the default eslintrc-shaped `module.exports` above. ESLint's own
// eslintrc-mode config loader (`@eslint/eslintrc`'s `ConfigValidator`) schema-validates
// `require(...)`'s whole-module return value with `additionalProperties: false`, via
// `Object.keys()` -- which only visits ENUMERABLE own properties -- so a non-enumerable property
// is invisible to that validation and does not change the config shape ESLint sees, while
// `require('../../../.eslintrc.cjs').COMPONENT_DIRS` in a plain Node context (no schema
// validation involved) still reads it directly. Verified: a plain enumerable assignment here
// makes ESLint reject the file with "Unexpected top-level property \"COMPONENT_DIRS\"".
Object.defineProperty(module.exports, 'COMPONENT_DIRS', { value : COMPONENT_DIRS, enumerable : false })
