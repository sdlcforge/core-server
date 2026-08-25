import { getQuestionControls } from './get-question-controls'

const registerControlsIntegrations = async({ app, reporter }) => {
  reporter.log("Registering 'controls' integration...")
  // `npmName` below is `@sdlcforge/core-server`, not `@liquid-labs/liq-controls`: this code was
  // absorbed into `core-server`'s own tree at `src/controls/`, and `@liquid-labs/liq-controls` is
  // no longer an installed package. Reporting the capability under the identity of the package
  // that actually ships it is the decision recorded in
  // `plan/resources/absorption-parity-contract.md` (item 3); it is a predicted, accepted diff in
  // `GET /server/plugins/integrations/list` and in the full-tier baseline, not a regression.
  // `providerFor`, `name`, and the hook set are all deliberately unchanged. A literal rather than
  // a `package.json` read, because this module is bundled into `dist/sdlcforge-server.js`, where
  // no manifest lookup relative to this file's source location resolves.
  app.ext.integrations.register({
    hooks : {
      getQuestionControls
    },
    name         : 'controls',
    npmName      : '@sdlcforge/core-server',
    providerFor  : 'controls',
    providerTest : () => true
  })
}

export { registerControlsIntegrations }
