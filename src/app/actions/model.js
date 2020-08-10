import { addMonths, subDays } from 'date-fns'

import { calculateIncomeTaxActions } from './models/incomeTax.js'
import { calculateSocialActions } from './models/social.js'
import { calculateHealthActions } from './models/health.js'
import { calculateIllnessActions } from './models/illness.js'
import { calculateBufferActions } from './models/buffers.js'
import { resolveAllAndFlatten } from './utils.js'

export const confAllSame = value => [...Array(12)].map(() => value)
export const confMonthly = (value, year) =>
  value.map((v, i) => ({
    date: addMonths(subDays(new Date(`${year}-${String(i + 1).padStart(2, '0')}-01`), 5), 1),
    amount: v
  }))
export const configuration = {
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
      healthInsuranceBuffer: '💸🏥📊 Buffer - Health Insurance',
      illnessInsurancePrepayment: '💸👨‍⚕️ Illness Insurance - Prepayment',
      illnessInsuranceBuffer: '💸👨‍⚕️📊 Buffer - Illness Insurance',
      bufferIncome: '💸📊 Buffer - Income',
      bufferPerfomance: '💸📊 Buffer - Performance'
    }
  }
}

const convertConfig = conf => ({
  incomeTax: conf.find(c => c.keyType === 'incomeTax').value,
  social: conf.find(c => c.keyType === 'social').value,
  health: conf.find(c => c.keyType === 'health').value,
  illness: conf.find(c => c.keyType === 'illness').value,
  budget: conf.find(c => c.keyType === 'budget').value
})

export const getActions = async (inv, conf) => {
  const config = conf.length === undefined ? conf : { ...configuration, ...convertConfig(conf) }

  return await resolveAllAndFlatten([
    calculateIncomeTaxActions(inv, config),
    calculateSocialActions(inv, config),
    calculateHealthActions(inv, config),
    calculateIllnessActions(inv, config),
    calculateBufferActions(inv, config)
  ])
}
