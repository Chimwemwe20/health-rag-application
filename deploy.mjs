import { execSync } from 'child_process'
import { cpSync, mkdirSync } from 'fs'

const DEPLOY_DIR = '.firebase/functions-deploy'

console.log('📦 Building shared...')
execSync('pnpm --filter shared build', { stdio: 'inherit' })

console.log('📦 Building functions...')
execSync('pnpm --filter functions build', { stdio: 'inherit' })

console.log('📁 Creating deploy folder...')
mkdirSync(DEPLOY_DIR, { recursive: true })

console.log('🚀 Running pnpm deploy...')
execSync(`pnpm --filter @repo/functions deploy --prod ${DEPLOY_DIR}`, { stdio: 'inherit' })

console.log('📂 Copying dist folder...')
cpSync('apps/functions/dist', `${DEPLOY_DIR}/dist`, { recursive: true })

console.log('🔥 Deploying to Firebase...')
execSync('firebase deploy', { stdio: 'inherit' })