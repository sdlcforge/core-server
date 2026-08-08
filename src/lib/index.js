import { Reporter } from '@liquid-labs/plugable-express'

export * from './app-init'

const name = '@sdlcforge/core-server'
const summary = 'Express-based HTTP server with plugin system for SDLC tools and integrations.'

export { name, summary, Reporter }
