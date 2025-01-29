import { cardsCmd } from './cards.js'
import { envsCmd } from './env.js'
import { executionsCmd } from './executions.js'
import { fetchCmd } from './fetch.js'
import { publishCmd } from './publish.js'
import { publishedCmd } from './published.js'
import { runCmd } from './run.js'
import { toggleCmd } from './toggle.js'
import { uploadCmd } from './upload.js'
import { uploadEnvsCmd } from './upload-env.js'
import { deployCmd } from './deploy.js'

export const commands = [cardsCmd, envsCmd, executionsCmd, deployCmd, fetchCmd, publishCmd, publishedCmd, runCmd, toggleCmd, uploadCmd, uploadEnvsCmd]