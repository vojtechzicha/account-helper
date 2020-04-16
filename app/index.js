import express from 'express'
import { getActions } from './model.js'

const app = express.Router()

app.post('/invoice-changed', async (req, res, next) => {
  if (req.body.status !== 'paid') res.json({ ok: false, message: 'invalid state transition' })

  const actions = await getActions({
    amount: req.body.total,
    date: new Date(req.body.paid_at),
    number: req.body.number
  })

  res.json({ ok: true, actions })
})

export default app
