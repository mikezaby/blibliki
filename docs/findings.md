## packages/display-protocol has no .prettierignore, so `format:check` fails on built dist

`packages/display-protocol/package.json` runs `prettier . --check`, and the
package has no `.prettierignore` (`packages/engine` and `packages/pi` both do).
Once the package has been built, `dist/index.js` and `dist/index.d.ts` are
checked and fail, so root `pnpm format:check` fails on any machine that has run
a build. Fix: add a `.prettierignore` containing `dist` to that package,
matching its siblings.
