import express from 'express'
import cors from 'cors'
import bp from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'

import api from './app/index.js'

const app = express()

app.use(cors())
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.disable('etag')
app.use((req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.header('Expires', '-1')
  res.header('Pragma', 'no-cache')

  req.headers['if-none-match'] = 'no-match-for-this'

  next()
})

app.use(morgan('dev', { skip: (req, res) => res.statusCode < 400 }))
app.use(morgan('common', { stream: fs.createWriteStream('./access.log', { flags: 'a' }) }))

app.use('/api/v1/', api)

app.listen(process.env.PORT || 3030)
