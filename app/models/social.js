import date from 'date-fns'

import { getInvoices, getBalance, getTransfers } from './../data.js'
import { sumFirst, roundHundredDown, roundHundredUp, reducerJoinLines, formatCurrency } from './../utils.js'
import { getIncomeTaxBase } from './incomeTax.js'

const diff = (dateA, dateB) =>
  date.differenceInCalendarMonths(dateA, dateB) === 0 ? 1 : Math.abs(date.differenceInCalendarMonths(dateA, dateB))

export const calculateSocialActions = async (inv, conf) => {
  const calcs = await Promise.all(
    Object.keys(conf.social).map((year, i) => getSocialCalculation(inv, Number.parseFloat(year), conf, i === 0))
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
    totalSocialToBePaid = calcs.reduce((p, c) => p + c.totalSocial, 0),
    totalSocialPaid = -calcs.reduce((p, c) => p + c.totalPaid, 0),
    depositBalance = calcs[0].depositBalance,
    prepaymentBalance = calcs[0].prepaymentBalance,
    bufferBalance = calcs[0].bufferBalance,
    missingPrepayment = totalPrepaymentToBePaid - prepaymentBalance,
    missingDepositBeforeDesire = totalSocialToBePaid - totalSocialPaid - depositBalance - prepaymentBalance - missingPrepayment,
    minimalDesiredDeposit =
      calcs[0].totalSocial - calcs[0].totalPaid - calcs[0].upcomingPrepayments.reduce((p, c) => p + c.amount, 0),
    missingDeposit =
      missingDepositBeforeDesire + Math.max(0, -(depositBalance + missingDepositBeforeDesire - minimalDesiredDeposit)),
    desiredBuffer = bufferPrepayments.map(p => Math.ceil(p.amount / diff(inv.date, p.date))).reduce((p, c) => p + c, 0),
    missingBuffer = desiredBuffer - bufferBalance

  console.log(
    'social',
    totalPrepaymentToBePaid,
    totalSocialToBePaid,
    totalSocialPaid,
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
      category: conf.ynab.categories.socialInsurancePrepayment,
      amount: missingPrepayment,
      memo: currentPrepayments
        .map(p => `${date.format(p.date, 'MMM yyyy')}: ${formatCurrency(p.amount)}`)
        .reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.socialInsuranceDeposit,
      amount: missingDeposit,
      memo: calcs
        .filter(c => c.totalSocial - c.totalPaid > 0)
        .map(c => `${c.year} Social to be Paid: ${formatCurrency(c.totalSocial)}`)
        .reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.socialInsuranceBuffer,
      amount: missingBuffer,
      memo: ''
    }
  ]
}

const getSocialCalculation = async (inv, year, conf, balances = true) => {
  const depositBalance = balances ? await getBalance(conf.ynab.categories.socialInsuranceDeposit, conf.ynab) : 0,
    prepaymentBalance = balances ? await getBalance(conf.ynab.categories.socialInsurancePrepayment, conf.ynab) : 0,
    bufferBalance = balances ? await getBalance(conf.ynab.categories.socialInsuranceBuffer, conf.ynab) : 0

  const totalPaid = (await getTransfers(year, 'SI', conf.ynab)).reduce((p, c) => p + c.amount, 0),
    upcomingPrepayments = [...conf.social[year].prepayments.filter(p => date.isBefore(inv.date, p.date))]

  const { totalIncome: income, expanses, months } = await getIncomeTaxBase(inv, year, conf)

  const socialBase = Math.min(
      Math.max((income - expanses) * 0.5 * conf.social[year].factor, sumFirst(conf.social[year].minimalBase, months)),
      (conf.social[year].maximalBase / 12) * months
    ),
    socialTotal = Math.ceil(socialBase * conf.social[year].rate)

  return {
    year,
    totalSocial: socialTotal,
    depositBalance,
    prepaymentBalance,
    bufferBalance,
    totalPaid,
    upcomingPrepayments
  }
}
