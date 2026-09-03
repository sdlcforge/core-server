import { validatePluginSet } from '@liquid-labs/plugable-express'

const packageRoot = process.cwd()

async function main() {
  let result
  try {
    result = await validatePluginSet({ packageRoot })
  } catch (e) {
    console.error('THROWN ERROR:', e && e.stack || e)
    process.exit(2)
  }
  console.log(JSON.stringify(result, null, 2))
}

main()
