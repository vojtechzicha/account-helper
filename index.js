import express from 'express'
import cors from 'cors'
import bp from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import mongo from 'mongodb'

import actionsApi from './app/actions/index.js'

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

app.use(morgan('dev', { skip: (_, res) => res.statusCode < 400 }))
app.use(morgan('common', { stream: fs.createWriteStream('./access.log', { flags: 'a' }) }))

app.use('/api/v1/', actionsApi)

const client = new mongo.MongoClient(process.env.MONGO_URI, {
  useUnifiedTopology: true
})
client.connect((err, conn) => {
  if (err) {
    console.error('No connection to the database')
    throw err
  }
  app.locals.db = conn.db(process.env.MONGO_DATABASE)

  app.listen(process.env.PORT || 3030)
})
