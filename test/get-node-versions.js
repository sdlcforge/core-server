#!/usr/bin/env node

const fs = require('fs')
const https = require('https')
const path = require('path')

// Read package.json to get minimum Node version
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Parse the minimum Node version from engines field
const enginesNode = packageJson.engines?.node || '>=18.0.0'
const minVersionMatch = enginesNode.match(/>=?(\d+)\./)
if (!minVersionMatch) {
  console.error('Could not parse Node version from engines field:', enginesNode)
  process.exit(1)
}

const minMajorVersion = parseInt(minVersionMatch[1])

// Function to get latest Node.js versions from nodejs.org
async function getNodeVersions() {
  return new Promise((resolve, reject) => {
    https.get('https://nodejs.org/dist/index.json', (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const versions = JSON.parse(data)
          resolve(versions)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// Get the latest version for each major version >= minimum
async function getTestVersions() {
  try {
    const allVersions = await getNodeVersions()
    const latestByMajor = {}
    
    // Group versions by major version and find the latest
    for (const versionInfo of allVersions) {
      const version = versionInfo.version.substring(1) // Remove 'v' prefix
      const majorVersion = parseInt(version.split('.')[0])
      
      // Only include versions >= minimum major version
      if (majorVersion >= minMajorVersion) {
        if (!latestByMajor[majorVersion] || 
            compareVersions(version, latestByMajor[majorVersion]) > 0) {
          latestByMajor[majorVersion] = version
        }
      }
    }
    
    // Sort by major version and return array
    const testVersions = Object.keys(latestByMajor)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(major => latestByMajor[major])
    
    return testVersions
  } catch (error) {
    console.error('Error fetching Node versions:', error)
    // Fallback to some default versions if API fails
    const fallbackVersions = []
    for (let major = minMajorVersion; major <= 22; major++) {
      fallbackVersions.push(`${major}.0.0`)
    }
    return fallbackVersions
  }
}

// Compare two version strings
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1
    if (parts1[i] < parts2[i]) return -1
  }
  return 0
}

// Main execution
if (require.main === module) {
  getTestVersions().then(versions => {
    console.log(JSON.stringify({
      minVersion: `${minMajorVersion}.0.0`,
      testVersions: versions
    }, null, 2))
  }).catch(error => {
    console.error('Failed to get test versions:', error)
    process.exit(1)
  })
}

module.exports = { getTestVersions }