import date from 'date-fns'

import { calculateIncomeTaxActions } from './models/incomeTax.js'
import { calculateSocialActions } from './models/social.js'
import { calculateHealthActions } from './models/health.js'
import { resolveAllAndFlatten } from './utils.js'

export const confAllSame = value => [...Array(12)].map(() => value)
export const confMonthly = (value, year) =>
  value.map((v, i) => ({
    date: date.addMonths(date.subDays(new Date(`${year}-${String(i + 1).padStart(2, '0')}-01`), 5), 1),
    amount: v
  }))
const configuration = {
  ynab: {
    pat: process.env.YNAB_PAT,
    budgetId: process.env.YNAB_BUDGET_ID,
    categories: {
      vatIncome: '💸👮‍♂️ Value Added Tax',
      incomeTaxPrepayment: '💸👮‍♂️ Income Tax - Prepayment',
      incomeTaxDeposit: '💸👮‍♂️ Income Tax - Deposit',
      socialInsurancePrepayment: '💸👴 Social Insurance - Prepayment',
      socialInsuranceDeposit: '💸👴 Social Insurance - Deposit',
      socialInsuranceBuffer: '💸👴📊 Buffer - Social Insurance',
      healthInsurancePrepayment: '💸🏥 Health Insurance - Prepayment',
      healthInsuranceDeposit: '💸🏥 Health Insurance - Deposit',
      healthInsuranceBuffer: '💸🏥📊 Buffer - Health Insurance'
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
  },
  social: {
    2020: {
      rate: 0.292,
      minimalBase: [8709, 8709, 0, 0, 0, 0, 0, 0, 8709, 8709, 8709, 8709],
      prepayments: confMonthly([7996, 7996, 0, 0, 0, 0, 0, 0, 7996, 7996, 7996, 7996], 2020),
      maximalBase: 1569552 - 7996 * 6,
      factor: process.env.SOCIAL_FACTOR
    }
  },
  health: {
    2020: {
      rate: 0.135,
      minimalBase: [17418, 17418, 0, 0, 0, 0, 0, 0, 17418, 17418, 17418, 17418],
      prepayments: confMonthly([3361, 3361, 0, 0, 0, 0, 0, 0, 3361, 3361, 3361, 3361], 2020)
    }
  }
}

export const getActions = async inv => {
  return await resolveAllAndFlatten([
    calculateIncomeTaxActions(inv, configuration),
    calculateSocialActions(inv, configuration),
    calculateHealthActions(inv, configuration)
  ])
}
