import express from 'express'
import { getActions } from './model.js'

const app = express.Router()

app.post('/invoice-changed', async (req, res, next) => {
  try {
    const db = req.app.locals.db
    const config = await db.collection('config').find({}).toArray()

    if (req.body.status !== 'paid') res.json({ ok: false, message: 'invalid state transition' })

    const actions = await getActions(
      {
        amount: req.body.total,
        date: new Date(req.body.paid_at),
        number: req.body.number
      },
      config
    )
    res.json({ ok: true, actions })
  } catch (e) {
    console.log(e)
    res.status(500).json({ ok: false })
  }
})

export default app
