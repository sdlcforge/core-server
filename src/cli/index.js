import { COMPLY_SERVER_CLI_NAME, COMPLY_PORT } from '@liquid-labs/comply-defaults'
import { startServer } from '@liquid-labs/plugable-express'

import { appInit } from '../lib/app-init'

const port = COMPLY_PORT()

startServer(({ appInit, name: COMPLY_SERVER_CLI_NAME(), port }))
