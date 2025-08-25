#!/usr/bin/env node

const http = require('http')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Extract binary name from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const BINARY_NAME = Object.keys(packageJson.bin || {})[0] || 'sdlcforge-server'

// Configuration  
const SERVER_PORT = process.env.SERVER_PORT || 32600
const SERVER_HOST = 'localhost'
console.log(`Test script using SERVER_PORT: ${SERVER_PORT} (from env: ${process.env.SERVER_PORT})`)
const TEST_TIMEOUT = 30000 // 30 seconds

// Test results collector
const testResults = {
  nodeVersion: process.version,
  tests: [],
  passed: 0,
  failed: 0
}

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })
    
    req.on('error', reject)
    req.setTimeout(5000)
    
    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30) {
  console.log(`Waiting for server at ${SERVER_HOST}:${SERVER_PORT}/heartbeat`)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest({
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: '/heartbeat',
        method: 'GET'
      })
      
      if (response.statusCode === 200) {
        console.log('Server is ready')
        return true
      }
      console.log(`Attempt ${i + 1}: Got status ${response.statusCode}`)
    } catch (error) {
      console.log(`Attempt ${i + 1}: Connection failed - ${error.message}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Server failed to start within timeout period')
}

// Test suite
async function runTests() {
  const tests = [
    {
      name: 'Server Status',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/status',
          method: 'GET'
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        const data = JSON.parse(response.body)
        if (!data.status || data.status !== 'OK') {
          throw new Error('Server status is not OK')
        }
      }
    },
    {
      name: 'Server Version',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/version',
          method: 'GET'
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        const data = JSON.parse(response.body)
        if (!data.version) {
          throw new Error('No version information returned')
        }
      }
    },
    {
      name: 'API Documentation',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/api',
          method: 'GET'
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        const data = JSON.parse(response.body)
        if (!Array.isArray(data)) {
          throw new Error('API response is not an array')
        }
        
        if (data.length === 0) {
          throw new Error('No API endpoints registered')
        }
      }
    },
    {
      name: 'List Plugins',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/plugins/list',
          method: 'GET'
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        const data = JSON.parse(response.body)
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid plugin list response')
        }
      }
    },
    {
      name: 'Server Next Commands',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/next-commands',
          method: 'GET'
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        const data = JSON.parse(response.body)
        if (!data.commands || !Array.isArray(data.commands)) {
          throw new Error('Invalid next-commands response')
        }
      }
    },
    {
      name: 'Invalid Endpoint Returns 404',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/invalid/endpoint',
          method: 'GET'
        })
        
        if (response.statusCode !== 404) {
          throw new Error(`Expected status 404, got ${response.statusCode}`)
        }
      }
    },
    {
      name: 'Server Accepts JSON',
      async run() {
        const response = await makeRequest({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: '/server/status',
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`)
        }
        
        if (!response.headers['content-type'].includes('application/json')) {
          throw new Error('Response is not JSON')
        }
      }
    }
  ]
  
  // Run each test
  for (const test of tests) {
    try {
      await test.run()
      testResults.tests.push({
        name: test.name,
        status: 'PASSED'
      })
      testResults.passed++
      console.log(`✓ ${test.name}`)
    } catch (error) {
      testResults.tests.push({
        name: test.name,
        status: 'FAILED',
        error: error.message
      })
      testResults.failed++
      console.log(`✗ ${test.name}: ${error.message}`)
    }
  }
  
  return testResults
}

// Start the server
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn(BINARY_NAME, [], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    let serverLogs = ''
    let serverErrors = ''
    let hasExited = false
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      serverLogs += output
      console.log(`[Server]: ${output}`)
    })
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString()
      serverErrors += output
      console.error(`[Server Error]: ${output}`)
    })
    
    serverProcess.on('error', (error) => {
      reject(new Error(`Failed to start server: ${error.message}`))
    })
    
    serverProcess.on('exit', (code, signal) => {
      hasExited = true
      if (code !== 0) {
        reject(new Error(`Server exited unexpectedly with code ${code}. Last errors: ${serverErrors.slice(-500)}`))
      }
    })
    
    // Give server time to start, then check if it's still running
    setTimeout(() => {
      if (hasExited) {
        reject(new Error(`Server exited during startup. Last errors: ${serverErrors.slice(-500)}`))
      } else {
        resolve(serverProcess)
      }
    }, 3000) // Increased timeout to 3 seconds
  })
}

// Main test runner
async function main() {
  let serverProcess = null
  
  try {
    console.log(`Starting tests with Node ${process.version}`)
    console.log(`Starting ${BINARY_NAME}...`)
    
    serverProcess = await startServer()
    
    console.log('Waiting for server to be ready...')
    await waitForServer()
    
    console.log('Running test suite...')
    const results = await runTests()
    
    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log(`Test Results for Node ${process.version}`)
    console.log('='.repeat(50))
    console.log(`Passed: ${results.passed}`)
    console.log(`Failed: ${results.failed}`)
    console.log('='.repeat(50))
    
    // Write results to file
    const fs = require('fs')
    const resultsFile = `/tmp/test-results-node-${process.version.replace(/\./g, '_')}.json`
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))
    console.log(`Results written to ${resultsFile}`)
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('Test suite failed:', error)
    process.exit(1)
  } finally {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}