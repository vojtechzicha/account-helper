import date from 'date-fns'

import { getInvoices, getBalance, getTransfers } from './../data.js'
import { sumFirst, roundHundredDown, roundHundredUp, reducerJoinLines, formatCurrency } from './../utils.js'

const diff = (dateA, dateB) =>
  date.differenceInCalendarMonths(dateA, dateB) === 0 ? 1 : Math.abs(date.differenceInCalendarMonths(dateA, dateB))

export const calculateIncomeTaxActions = async (inv, conf) => {
  const calcs = await Promise.all(
    Object.keys(conf.incomeTax).map((year, i) => getIncomeTaxCalculation(inv, Number.parseFloat(year), conf, i === 0))
  )

  if (calcs.length === 0) return []

  const allPrepayments = calcs
    .reduce((p, c) => [...p, ...c.upcomingPrepayments], [])
    .sort(date.compareAsc)
    .filter((p, i) => i < 2 && diff(inv.date, p.date) <= 9)

  const totalPrepaymentToBePaid = allPrepayments
      .map(p => Math.ceil(p.amount / diff(inv.date, p.date)))
      .reduce((p, c) => p + c, 0),
    totalTaxToBePaid = calcs.reduce((p, c) => p + c.totalTax, 0),
    totalTaxPaid = -calcs.reduce((p, c) => p + c.totalPaid, 0),
    depositBalance = calcs[0].depositBalance,
    prepaymentBalance = calcs[0].prepaymentBalance,
    missingPrepayment = totalPrepaymentToBePaid - prepaymentBalance,
    missingDepositBeforeDesire = totalTaxToBePaid - totalTaxPaid - depositBalance - prepaymentBalance - missingPrepayment,
    minimalDesiredDeposit =
      calcs[0].totalTax - calcs[0].totalPaid - calcs[0].upcomingPrepayments.reduce((p, c) => p + c.amount, 0),
    missingDeposit =
      missingDepositBeforeDesire + Math.max(0, -(depositBalance + missingDepositBeforeDesire - minimalDesiredDeposit))

  console.log(
    'incomeTax',
    totalPrepaymentToBePaid,
    totalTaxToBePaid,
    totalTaxPaid,
    depositBalance,
    prepaymentBalance,
    missingPrepayment,
    missingDepositBeforeDesire,
    minimalDesiredDeposit,
    missingDeposit
  )
  return [
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.incomeTaxPrepayment,
      amount: missingPrepayment,
      memo: allPrepayments
        .map(p => `${date.format(p.date, 'MMM yyyy')}: ${formatCurrency(p.amount)}`)
        .reduce(reducerJoinLines, '')
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.incomeTaxDeposit,
      amount: missingDeposit,
      memo: calcs
        .filter(c => c.totalTax - c.totalPaid > 0)
        .map(c => `${c.year} Tax to be Paid: ${formatCurrency(c.totalTax)}`)
        .reduce(reducerJoinLines, '')
    }
  ]
}

const getIncomeTaxCalculation = async (inv, year, conf, balances = true) => {
  const depositBalance = balances ? await getBalance(conf.ynab.categories.incomeTaxDeposit, conf.ynab) : 0,
    prepaymentBalance = balances ? await getBalance(conf.ynab.categories.incomeTaxPrepayment, conf.ynab) : 0

  const totalPaid = (await getTransfers(year, 'IT', conf.ynab)).reduce((p, c) => p + c.amount, 0),
    upcomingPrepayments = [...(await getIncomeTaxPrepayments(inv, year, conf)).filter(p => date.isBefore(inv.date, p.date))]

  return {
    year,
    totalTax: year > date.getYear(inv.date) ? 0 : (await getIncomeTaxBase(inv, year, conf)).totalTax,
    depositBalance,
    prepaymentBalance,
    totalPaid,
    upcomingPrepayments
  }
}

export const getIncomeTaxBase = async (inv, year, conf) => {
  if (year > date.getYear(inv.date))
    return {
      income: 0,
      totalIncome: 0,
      expanses: 0,
      months: 0,
      currentDeduction: 0,
      currentDiscount: 0,
      totalTax: 0
    }

  const income = await getIncome(year, conf),
    includeInv = !Object.keys(income.invoices).includes(inv.number) && year === date.getYear(inv.date),
    totalIncome = income.income + (includeInv ? inv.amount : 0),
    expanses = getExpanses(totalIncome, year, conf),
    months = year < date.getYear(inv.date) ? 12 : date.getMonth(inv.date) + 1

  const currentDeduction = sumFirst(conf.incomeTax[year].deduction, months),
    currentDiscount = sumFirst(conf.incomeTax[year].discount, months),
    totalTax = roundHundredDown((totalIncome - expanses - currentDeduction) * conf.incomeTax[year].rate - currentDiscount)

  return {
    income,
    totalIncome,
    expanses,
    months,
    currentDeduction,
    currentDiscount,
    totalTax
  }
}

const getIncomeTaxPrepayments = async (inv, year, conf) => {
  if (conf.incomeTax[year].prepayments !== null) return conf.incomeTax[year].prepayments

  const { totalTax, months } = await getIncomeTaxBase(inv, year - 1, conf)
  const adjustedTax = months === 0 ? 0 : (totalTax / months) * 12

  if (adjustedTax > 150000)
    return [
      { date: new Date(`${year}-03-01`), amount: roundHundredUp(adjustedTax * 0.25) },
      { date: new Date(`${year}-06-01`), amount: roundHundredUp(adjustedTax * 0.25) },
      { date: new Date(`${year}-09-01`), amount: roundHundredUp(adjustedTax * 0.25) },
      { date: new Date(`${year}-12-01`), amount: roundHundredUp(adjustedTax * 0.25) }
    ]
  else if (adjustedTax > 30000)
    return [
      { date: new Date(`${year}-06-01`), amount: roundHundredUp(adjustedTax * 0.4) },
      { date: new Date(`${year}-12-01`), amount: roundHundredUp(adjustedTax * 0.4) }
    ]
  else return []
}

const getIncome = (cache => async (year, conf) => {
  if (cache[year] !== undefined) return cache[year]

  const invoices = await getInvoices(year, conf.ynab)

  return (cache[year] = {
    income: invoices.reduce((p, c) => p + c.amount, 0),
    invoices: invoices.reduce((p, c) => ({ ...p, [c.number]: c.amount }), {})
  })
})([])

const getExpanses = (income, year, conf) => {
  return Math.min(conf.incomeTax[year].maximalExpanses, income * conf.incomeTax[year].expanseRate)
}
