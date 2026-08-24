import { getQuestionControls } from './get-question-controls'

const registerControlsIntegrations = async({ app, reporter }) => {
  reporter.log("Registering '@liquid-labs/liq-controls' integration...")
  app.ext.integrations.register({
    hooks : {
      getQuestionControls
    },
    name         : 'controls',
    npmName      : '@liquid-labs/liq-controls',
    providerFor  : 'controls',
    providerTest : () => true
  })
}

export { registerControlsIntegrations }
