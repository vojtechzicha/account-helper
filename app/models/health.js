import date from 'date-fns'

import { getBalance, getTransfers } from './../data.js'
import { sumFirst, reducerJoinLines, formatCurrency } from './../utils.js'
import { getIncomeTaxBase } from './incomeTax.js'

const diff = (dateA, dateB) =>
  date.differenceInCalendarMonths(dateA, dateB) === 0 ? 1 : Math.abs(date.differenceInCalendarMonths(dateA, dateB))

export const calculateHealthActions = async (inv, conf) => {
  const calcs = await Promise.all(
    Object.keys(conf.health).map((year, i) => getHealthCalculation(inv, Number.parseFloat(year), conf, i === 0))
  )

  if (calcs.length === 0) return []

  const currentPrepayments = calcs
    .reduce((p, c) => [...p, ...c.upcomingPrepayments], [])
    .sort(date.compareAsc)
    .filter((p, i) => i < 2 && diff(inv.date, p.date) <= 9)

  const bufferPrepayments = calcs
    .reduce((p, c) => [...p, ...c.upcomingPrepayments], [])
    .sort(date.compareAsc)
    .filter((p, i) => i < 6 && diff(inv.date, p.date) <= 12 && !currentPrepayments.includes(p))

  const totalPrepaymentToBePaid = currentPrepayments
      .map(p => Math.ceil(p.amount / diff(inv.date, p.date)))
      .reduce((p, c) => p + c, 0),
    totalHealthToBePaid = calcs.reduce((p, c) => p + c.totalHealth, 0),
    totalHealthPaid = -calcs.reduce((p, c) => p + c.totalPaid, 0),
    depositBalance = calcs[0].depositBalance,
    prepaymentBalance = calcs[0].prepaymentBalance,
    bufferBalance = calcs[0].bufferBalance,
    missingPrepayment = totalPrepaymentToBePaid - prepaymentBalance,
    missingDepositBeforeDesire = totalHealthToBePaid - totalHealthPaid - depositBalance - prepaymentBalance - missingPrepayment,
    minimalDesiredDeposit =
      calcs[0].totalHealth - calcs[0].totalPaid - calcs[0].upcomingPrepayments.reduce((p, c) => p + c.amount, 0),
    missingDeposit =
      missingDepositBeforeDesire + Math.max(0, -(depositBalance + missingDepositBeforeDesire - minimalDesiredDeposit)),
    desiredBuffer = bufferPrepayments.map(p => Math.ceil(p.amount / diff(inv.date, p.date))).reduce((p, c) => p + c, 0),
    missingBuffer = desiredBuffer - bufferBalance

  console.log(
    'health',
    totalPrepaymentToBePaid,
    totalHealthToBePaid,
    totalHealthPaid,
    depositBalance,
    prepaymentBalance,
    bufferBalance,
    missingPrepayment,
    missingDepositBeforeDesire,
    minimalDesiredDeposit,
    missingDeposit,
    desiredBuffer,
    missingBuffer
  )
  return [
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.healthInsurancePrepayment,
      amount: missingPrepayment,
      business: true,
      memo: currentPrepayments
        .map(p => `${date.format(p.date, 'MMM yyyy')}: ${formatCurrency(p.amount)}`)
        .reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.healthInsuranceDeposit,
      amount: missingDeposit,
      business: true,
      memo: calcs
        .filter(c => c.totalHealth - c.totalPaid > 0)
        .map(c => `${c.year} Health to be Paid: ${formatCurrency(c.totalHealth)}`)
        .reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.healthInsuranceBuffer,
      amount: missingBuffer,
      business: false,
      memo: ''
    }
  ]
}

const getHealthCalculation = async (inv, year, conf, balances = true) => {
  const depositBalance = balances ? await getBalance(conf.ynab.categories.healthInsuranceDeposit, conf.ynab) : 0,
    prepaymentBalance = balances ? await getBalance(conf.ynab.categories.healthInsurancePrepayment, conf.ynab) : 0,
    bufferBalance = balances ? await getBalance(conf.ynab.categories.healthInsuranceBuffer, conf.ynab) : 0

  const totalPaid = (await getTransfers(year, 'HI', conf.ynab)).reduce((p, c) => p + c.amount, 0),
    upcomingPrepayments = [...conf.health[year].prepayments.filter(p => date.isBefore(inv.date, p.date))]

  const { totalIncome: income, expanses, months } = await getIncomeTaxBase(inv, year, conf)

  const healthBase = Math.max((income - expanses) * 0.5, sumFirst(conf.health[year].minimalBase, months)),
    healthTotal = Math.ceil(healthBase * conf.health[year].rate)

  return {
    year,
    totalHealth: healthTotal,
    depositBalance,
    prepaymentBalance,
    bufferBalance,
    totalPaid,
    upcomingPrepayments
  }
}
