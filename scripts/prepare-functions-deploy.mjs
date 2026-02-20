import { mkdirSync } from 'fs'

const DEPLOY_DIR = '.firebase/functions-deploy'
mkdirSync(DEPLOY_DIR, { recursive: true })
console.log(`✅ Created ${DEPLOY_DIR}`)
