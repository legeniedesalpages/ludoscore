// Generates src/environments/version.ts (version + build date) before start/build.
const fs = require('fs')
const path = require('path')

const pkg = require('../package.json')
const run = process.env.GITHUB_RUN_NUMBER
const [major, minor] = pkg.version.split('.')
const version = run ? `${major}.${minor}.${run}` : pkg.version

const content = `export const appVersion = {
    version: '${version}',
    buildDate: '${new Date().toISOString()}'
}
`
fs.writeFileSync(path.join(__dirname, '..', 'src', 'environments', 'version.ts'), content)
