import express from 'express'
import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import fs from 'fs'
import morgan from 'morgan'
import path from 'path'
import { MongoClient } from 'mongodb'

import actionsApi from './app/actions/index.js'

console.log('application started')

console.log('1. Expresss Configuration')

const app = express()

app.use(cors())

app.use(json())
app.use(urlencoded({ extended: true }))

app.use(
  morgan('dev', {
    skip: (req, res) => res.statusCode < 400
  })
)

app.disable('etag')

app.use((req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.header('Expires', '-1')
  res.header('Pragma', 'no-cache')

  req.headers['if-none-match'] = 'no-match-for-this'

  next()
})

console.log('1) Expresss Configuration - DONE')

console.log('2. Morgan Configuration')

app.use(
  morgan('common', {
    stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
  })
)

console.log('2) Morgan Configuration - DONE')

console.log('3. MongoDB Configuration')

const client = new MongoClient(process.env.MONGO_URI, {
  useUnifiedTopology: true
})
client.connect((err, conn) => {
  if (err) {
    console.error('No connection to the database')
    throw err
  }
  app.locals.db = conn.db(process.env.MONGO_DATABASE)

  console.log('3) MongoDB Configuration - DONE')
  console.log('4. Listening')

  app.listen(process.env.PORT || 3030)
})

app.use('/api/v1/', actionsApi)
