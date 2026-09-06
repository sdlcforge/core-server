import createError from 'http-errors'
import { view } from '@liquid-labs/npm-toolkit'
import * as semver from '@liquid-labs/semver-plus'
import { tryExec } from '@liquid-labs/shell-toolkit'

const doNpmPublish = ({ nextVer, otp, projectName, projectPath, reporter }) => {
  reporter.push('Preparing to publish...')

  let tagOpt = ''
  const nextVerPreRelease = semver.prerelease(nextVer)
  console.log(`nextVer: ${nextVer}; nextVerPreRelease:`, nextVerPreRelease) // DEBUG
  if (nextVerPreRelease !== null) {
    reporter.push('Checking current latest version to determine prerelease tag...')
    const pkgInfo = view({ packageName : projectName })
    const currLatest = pkgInfo?.version
    if (currLatest === undefined
        || (semver.prerelease(currLatest) !== null
            && semver.gt(nextVer, currLatest, { loose : true, includePrerelease : true })
        )) {
      tagOpt = ' --tag latest'
    }
    else {
      const pretype = nextVerPreRelease?.[0]
      if (semver.STANDARD_PRERELEASE_NAMES.includes(pretype)) {
        tagOpt = ` --tag ${pretype}`
      }
      else {
        tagOpt = ' --tag next'
      }
    }
    reporter.push(`  using tag: ${tagOpt}`)
  }
  const otpOpt = otp === undefined ? '' : ` --otp=${otp}`

  const pushCmd = `cd '${projectPath}' && npm publish${otpOpt}${tagOpt}`
  const publishResult = tryExec(pushCmd, { timout : 1500 /* 1.5 sec */ })
  if (publishResult.code !== 0) { throw createError(`Project '${projectName}' preparation succeeded, but was unable to publish to npm; perhaps you need to include the 'otp' option? Stderr: ${publishResult.stderr}`) }
  reporter.push('  success.')
}

export { doNpmPublish }
