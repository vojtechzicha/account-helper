import { calculateIncomeTaxActions } from './models/incomeTax.js'
import { resolveAllAndFlatten } from './utils.js'

export const confAllSame = value => [...Array(12)].map(() => value)
const configuration = {
  ynab: {
    pat: process.env.YNAB_PAT,
    budgetId: process.env.YNAB_BUDGET_ID,
    categories: {
      vatIncome: '💸👮‍♂️ Value Added Tax',
      incomeTaxPrepayment: '💸👮‍♂️ Income Tax - Prepayment',
      incomeTaxDeposit: '💸👮‍♂️ Income Tax - Deposit'
    }
  },
  incomeTax: {
    2020: {
      maximalExpanses: 1200000,
      expanseRate: 0.6,
      rate: 0.15,
      deduction: confAllSame(2000),
      discount: confAllSame(2070),
      prepayments: []
    },
    2021: {
      maximalExpanses: 1200000,
      expanseRate: 0.6,
      rate: 0.15,
      deduction: confAllSame(2000),
      discount: confAllSame(2070),
      prepayments: null
    }
  }
}

export const getActions = async inv => {
  return await resolveAllAndFlatten([calculateIncomeTaxActions(inv, configuration)])
}
