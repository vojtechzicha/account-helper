import { getMonth, addMonths, getYear } from 'date-fns'

import { getBalance } from './../data.js'
import { calculateIncomeTaxActions } from './incomeTax.js'
import { calculateHealthActions } from './health.js'
import { calculateSocialActions } from './social.js'
import { calculateIllnessActions } from './illness.js'
import { resolveAllAndFlatten } from './../utils.js'

export const calculateBufferActions = async (inv, conf) => {
  const incomeBufferBalance = await getBalance(conf.ynab.categories.bufferIncome, conf.ynab),
    performanceBufferBalance = await getBalance(conf.ynab.categories.bufferPerfomance, conf.ynab)

  const mandatorySpents = (
      await resolveAllAndFlatten([
        calculateIncomeTaxActions(inv, conf),
        calculateSocialActions(inv, conf),
        calculateHealthActions(inv, conf),
        calculateIllnessActions(inv, conf)
      ])
    )
      .filter(a => a.business === true)
      .reduce((p, c) => p + c.amount, 0),
    currentIncome = inv.amount / 1.21,
    usableIncome = currentIncome - mandatorySpents,
    reservedIncome =
      usableIncome < conf.budget.liveExpansesMinimum
        ? usableIncome
        : usableIncome < conf.budget.liveExpansesMinimum * 2
        ? conf.budget.liveExpansesMinimum * 1.5
        : usableIncome < conf.budget.liveExpansesMinimum * 3
        ? conf.budget.liveExpansesMinimum * 2.2
        : conf.budget.liveExpansesMinimum * 2.5,
    bufferMax = Math.ceil((usableIncome - reservedIncome) / 2),
    currentQuarterPlan = getQuarterPlan(conf.budget.plan, inv.date),
    currentMonthPlan = getMonthPlan(conf.budget.plan, inv.date)

  const incomeBufferDesired = currentQuarterPlan * 0.75,
    incomeBufferContribution = Math.round(Math.min(incomeBufferDesired - incomeBufferBalance, bufferMax)),
    performanceBufferDesired = currentMonthPlan - currentIncome,
    performanceBufferMax = currentMonthPlan * 1.1,
    performanceBufferContribution =
      performanceBufferDesired < 0
        ? Math.round(
            Math.min(
              performanceBufferMax,
              Math.min(-performanceBufferDesired, bufferMax / (performanceBufferBalance > performanceBufferMax * 0.5 ? 2 : 1))
            )
          )
        : -Math.round(Math.min(performanceBufferDesired, performanceBufferBalance))

  console.log(
    'buffers',
    mandatorySpents,
    usableIncome,
    reservedIncome,
    bufferMax,
    currentQuarterPlan,
    currentMonthPlan,
    incomeBufferDesired,
    incomeBufferContribution,
    performanceBufferDesired,
    performanceBufferMax,
    performanceBufferContribution
  )

  return [
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.bufferIncome,
      amount: incomeBufferContribution,
      business: false,
      memo: ''
    },
    {
      type: 'ynabBudget',
      category: conf.ynab.categories.bufferPerfomance,
      amount: performanceBufferContribution,
      business: false,
      memo: ''
    }
  ]
}

const dateAdd = (invDate, n, month = true) => (month ? getMonth(addMonths(invDate, n)) : getYear(addMonths(invDate, n)))
const getQuarterPlan = (plans, invDate) =>
  plans[getYear(invDate)] === undefined
    ? 0
    : Math.max(0, plans[dateAdd(invDate, 0, false)][dateAdd(invDate, 0)]) +
      Math.max(0, plans[dateAdd(invDate, 1, false)][dateAdd(invDate, 1)]) +
      Math.max(0, plans[dateAdd(invDate, 2, false)][dateAdd(invDate, 2)])
const getMonthPlan = (plans, invDate) =>
  plans[getYear(invDate)] === undefined ? 0 : Math.max(0, plans[dateAdd(invDate, 0, false)][dateAdd(invDate, 0)])
