import { differenceInCalendarMonths, compareAsc, format, isBefore } from 'date-fns'

import { getBalance } from './../data.js'
import { reducerJoinLines, formatCurrency } from './../utils.js'

const diff = (dateA, dateB) => (differenceInCalendarMonths(dateA, dateB) === 0 ? 1 : Math.abs(differenceInCalendarMonths(dateA, dateB)))

export const calculateIllnessActions = async (inv, conf) => {
  const calcs = await Promise.all(Object.keys(conf.illness).map((year, i) => getIllnessCalculation(inv, year, conf, i === 0)))

  if (calcs.length === 0) return []

  const currentPrepayments = calcs
    .reduce((p, c) => [...p, ...c.upcomingPrepayments], [])
    .sort(compareAsc)
    .filter((p, i) => i < 2 && diff(inv.date, p.date) <= 9)

  const bufferPrepayments = calcs
    .reduce((p, c) => [...p, ...c.upcomingPrepayments], [])
    .sort(compareAsc)
    .filter((p, i) => i < 6 && diff(inv.date, p.date) <= 12 && !currentPrepayments.includes(p))

  const totalPrepaymentToBePaid = currentPrepayments.map(p => Math.ceil(p.amount / diff(inv.date, p.date))).reduce((p, c) => p + c, 0),
    prepaymentBalance = calcs[0].prepaymentBalance,
    bufferBalance = calcs[0].bufferBalance,
    missingPrepayment = totalPrepaymentToBePaid - prepaymentBalance,
    desiredBuffer = bufferPrepayments.map(p => Math.ceil(p.amount / diff(inv.date, p.date))).reduce((p, c) => p + c, 0),
    missingBuffer = desiredBuffer - bufferBalance

  console.log('illness', totalPrepaymentToBePaid, prepaymentBalance, bufferBalance, missingPrepayment, desiredBuffer, missingBuffer)
  return [
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.illnessInsurancePrepayment,
      amount: missingPrepayment,
      business: true,
      memo: currentPrepayments.map(p => `${format(p.date, 'MMM yyyy')}: ${formatCurrency(p.amount)}`).reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.illnessInsuranceBuffer,
      amount: missingBuffer,
      business: false,
      memo: ''
    }
  ]
}

const getIllnessCalculation = async (inv, year, conf, balances = true) => {
  const prepaymentBalance = balances ? await getBalance(conf.ynab.categories.illnessInsurancePrepayment, conf.ynab) : 0,
    bufferBalance = balances ? await getBalance(conf.ynab.categories.illnessInsuranceBuffer, conf.ynab) : 0

  const upcomingPrepayments = [...conf.illness[year].prepayments.filter(p => isBefore(inv.date, p.date))]

  console.log(`illness ${year}`, prepaymentBalance, bufferBalance, upcomingPrepayments.length)

  return {
    year,
    prepaymentBalance,
    bufferBalance,
    upcomingPrepayments
  }
}
