import { CATALYST_PORT } from '@liquid-labs/catalyst-defaults'
import { startServer } from '@liquid-labs/plugable-express'

import { appInit } from '../lib/app-init'

const port = CATALYST_PORT()

startServer(({ appInit, port }))
