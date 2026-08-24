import { registerControlsIntegrations } from './integrations/register-controls-integrations'
import { loadControls } from './resources/load-controls'

const setup = ({ app }) => {
  app.ext.setupMethods.push({
    name : 'load org controls',
    deps : ['load orgs'],
    func : loadControls
  })

  app.ext.setupMethods.push({
    name : 'load controls integrations',
    deps : ['setup integrations'],
    func : registerControlsIntegrations
  })
}

export { setup }
