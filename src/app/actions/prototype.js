import date from 'date-fns'
import axios from 'axios'

const businessCashMinimum = 20000
const liveExpansesMinimum = 35516
const monthFactor = 1

const n = n => n.toLocaleString('cs-CZ').padStart(12) + ' Kč'

const balanceCategories = {
  incomeTaxDeposit: '💸👮‍♂️ Income Tax - Deposit',
  socialInsurancePrepayment: '💸👴 Social Insurance - Prepayment',
  socialInsuranceDeposit: '💸👴 Social Insurance - Deposit',
  healthInsurancePrepayment: '💸🏥 Health Insurance - Prepayment',
  healthInsuranceDeposit: '💸🏥 Health Insurance - Deposit',
  illnessInsurancePrepayment: '💸👨‍⚕️ Illness Insurance - Prepayment',
  socialInsuranceBuffer: '💸👴📊 Buffer - Social Insurance',
  healthInsuranceBuffer: '💸🏥📊 Buffer - Health Insurance',
  illnessInsuranceBuffer: '💸👨‍⚕️📊 Buffer - Illness Insurance',
  bufferIncome: '💸📊 Buffer - Income',
  bufferPerfomance: '💸📊 Buffer - Performance'
}
const ynabPat = 'a9243c257a795d8f941c59551494b09230c729f0617ab456ba95fb900a93f18f'
const ynabBudgetId = '1a27a3d8-7136-43c6-9d30-8ce8e7e63154'
const getBalance = (data, name) =>
  data.data.category_groups.reduce((p, c) => [...p, ...c.categories], []).filter(c => c.name === name)[0].balance / 1000

const configuration = {
  soft: {
    businessCashMinimum: 20000,
    liveExpensesMinimum: 35516
  },
  incomeTax: { maximalExpanses: 1200000, expanseRate: 0.6, rate: 0.15, deduction: 2000, discount: 2070 },
  social: {
    rate: 0.292,
    minimalMonthlyPayment: 2544,
    minimalMonthlyBase: 8709,
    maximalMonthlyBase: 139340,
    discountMonths: [3, 4, 5, 6, 7, 8],
    factor: 1.1,
    presribedMonthlyPayment: 7996
  }
}

axios
  .get(`https://api.youneedabudget.com/v1/budgets/${ynabBudgetId}/categories`, {
    headers: { Authorization: `Bearer ${ynabPat}` }
  })
  .then(({ data }) => {
    const currentBalance = {
      incomeTaxDeposit: getBalance(data, balanceCategories.incomeTaxDeposit),
      socialInsurancePrepayment: getBalance(data, balanceCategories.socialInsurancePrepayment),
      socialInsuranceDeposit: getBalance(data, balanceCategories.socialInsuranceDeposit),
      healthInsurancePrepayment: getBalance(data, balanceCategories.healthInsurancePrepayment),
      healthInsuranceDeposit: getBalance(data, balanceCategories.healthInsuranceDeposit),
      illnessInsurancePrepayment: getBalance(data, balanceCategories.illnessInsurancePrepayment),
      socialInsuranceBuffer: getBalance(data, balanceCategories.socialInsuranceBuffer),
      healthInsuranceBuffer: getBalance(data, balanceCategories.healthInsuranceBuffer),
      illnessInsuranceBuffer: getBalance(data, balanceCategories.illnessInsuranceBuffer),
      bufferIncome: getBalance(data, balanceCategories.bufferIncome),
      bufferPerfomance: getBalance(data, balanceCategories.bufferPerfomance)
    }

    const documents = [
      { year: '2020', id: 'ILLNESS', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: -525 },
      { year: '2020', id: 'SOCIAL', income: 0, incomeTax: 0, socialInsurance: -2544, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'HEALTH', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: -2352, illnessInsurance: 0 },
      { year: '2020', id: 'ILLNESS', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: -523 },
      { year: '2020', id: 'SOCIAL', income: 0, incomeTax: 0, socialInsurance: -7996, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'HEALTH', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: -3361, illnessInsurance: 0 },
      { year: '2020', id: 'INVOICE', income: 114424, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'INVOICE', income: 141560, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'INVOICE', income: 167984, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'ILLNESS', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: -523 },
      { year: '2020', id: 'INVOICE', income: 196800, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: 0 },
      { year: '2020', id: 'ILLNESS', income: 0, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: -523 },
      { year: '2020', id: 'INVOICE', income: 129900, incomeTax: 0, socialInsurance: 0, healthInsurance: 0, illnessInsurance: 0 }
    ]

    const now = {
      date: date.addMonths(date.setDate(new Date(), 1), monthFactor),
      month: date.getMonth(date.addMonths(date.setDate(new Date(), 1), monthFactor)) + 1
    }

    const currentMonthPlan = 140800
    const currentQuarterPlan = 429440

    const totalIncome = documents.reduce((p, c) => p + c.income, 0)
    const totalExpanses =
      totalIncome * configuration.incomeTax.expanseRate <= configuration.incomeTax.maximalExpanses
        ? totalIncome * configuration.incomeTax.expanseRate
        : configuration.incomeTax.maximalExpanses

    const incomeTaxDeduction = configuration.incomeTax.deduction * now.month
    const incomeTaxDiscount = configuration.incomeTax.discount * now.month
    const incomeTaxTotal =
      Math.floor(((totalIncome - totalExpanses - incomeTaxDeduction) * configuration.incomeTax.rate - incomeTaxDiscount) / 100) * 100
    const incomeTaxPaid = documents.reduce((p, c) => p + c.incomeTax, 0)

    const incomeTaxMissing = Math.ceil(incomeTaxTotal - incomeTaxPaid - currentBalance.incomeTaxDeposit)
    const incomeTaxNewDeposit = incomeTaxMissing

    const incomeTaxResult = {
      total: incomeTaxTotal,
      paid: incomeTaxPaid,
      deposit: currentBalance.incomeTaxDeposit,
      missing: incomeTaxMissing,
      missingDeposit: incomeTaxNewDeposit
    }

    console.log()
    console.log(`Income tax 2020`)
    console.log('=======')
    console.log(`Tax to be paid:\t\t\t\t\t${n(incomeTaxTotal)}`)
    console.log(`Tax paid:\t\t\t\t\t${n(incomeTaxPaid)}`)
    console.log(`Tax deposit:\t\t\t\t\t${n(currentBalance.incomeTaxDeposit)}`)
    console.log('-------')
    console.log(`Missing value:\t\t\t\t\t${n(incomeTaxMissing)}`)
    console.log(`- Income Tax Deposit:\t\t\t\t${n(incomeTaxNewDeposit)}`)
    console.log()

    const socialMinimalBase = configuration.social.minimalMonthlyBase * now.month
    const socialMaximalBase = configuration.social.maximalMonthlyBase * now.month
    const socialReduced = month => configuration.social.discountMonths.includes(month)
    const socialDiscount = [...Array(now.month).keys()]
      .map(i => i + 1)
      .reduce((p, c) => p + (socialReduced(c) ? configuration.social.minimalMonthlyPayment : 0), 0)

    const socialActualBase =
      Math.min(Math.max((totalIncome - totalExpanses - incomeTaxDeduction) * 0.5, socialMinimalBase), socialMaximalBase) *
      configuration.social.factor
    const socialTotal = Math.ceil(socialActualBase * configuration.social.rate) - socialDiscount
    const socialPaid = -documents.reduce((p, c) => p + c.socialInsurance, 0)
    const socialMissing = socialTotal - socialPaid - currentBalance.socialInsuranceDeposit - currentBalance.socialInsurancePrepayment
    const socialCurrentMonthPrepayment = socialReduced(date.getMonth(now.date)) ? 0 : configuration.social.presribedMonthlyPayment
    const socialNextMonthPrepayment = socialReduced(date.getMonth(date.addMonths(now.date, 1)))
      ? 0
      : configuration.social.presribedMonthlyPayment
    const socialNewPrepayment = Math.max(
      0,
      socialCurrentMonthPrepayment + socialNextMonthPrepayment - currentBalance.socialInsurancePrepayment
    )
    const socialNewDeposit = Math.max(0, socialMissing - socialNewPrepayment)

    const socialResult = {
      total: socialTotal,
      paid: socialPaid,
      deposit: currentBalance.socialInsuranceDeposit + currentBalance.socialInsurancePrepayment,
      prepaymentThisMonthDescription: date.format(now.date, 'MMMM y'),
      prepaymentThisMonth: socialCurrentMonthPrepayment,
      prepaymentNextMonthDescription: date.format(date.addMonths(now.date, 1), 'MMMM y'),
      prepaymentNextMonth: socialNextMonthPrepayment,
      missingShown: socialNewDeposit + socialNewPrepayment,
      missingActual: socialMissing,
      missingDeposit: socialNewDeposit,
      missingPrepayment: socialNewPrepayment
    }

    console.log(`Social Insurance 2020`)
    console.log('=======')
    console.log(`Insurance to be paid:\t\t\t\t${n(socialTotal)}`)
    console.log(`Insurance paid:\t\t\t\t\t${n(socialPaid)}`)
    console.log(`Insurance deposit:\t\t\t\t${n(currentBalance.socialInsuranceDeposit + currentBalance.socialInsurancePrepayment)}`)
    console.log('-------')
    console.log(`- Social Insurace Prepayment - ${date.format(now.date, 'MMMM y')}:\t${n(socialCurrentMonthPrepayment)}`)
    console.log(`- Social Insurace Prepayment - ${date.format(date.addMonths(now.date, 1), 'MMMM y')}:\t${n(socialNextMonthPrepayment)}`)
    console.log('-------')
    console.log(
      `Missing value:\t\t\t\t\t${n(socialNewDeposit + socialNewPrepayment)}${
        socialMissing < socialNewDeposit + socialNewPrepayment ? ` (actual ${n(socialMissing)})` : ''
      }`
    )
    console.log(`- Social Insurance Deposit:\t\t\t${n(socialNewDeposit)}`)
    console.log(`- Social Insurance Prepayment:\t\t\t${n(socialNewPrepayment)}`)
    console.log()

    const healthRate = 0.135
    const healthMinimalMonthlyPayment = 2352
    const healthMinimalBase = 17418 * now.month
    const healthReduced = month => month >= 3 && month < 9
    const healthDiscount = [...Array(now.month).keys()]
      .map(i => i + 1)
      .reduce((p, c) => p + (healthReduced(c) ? healthMinimalMonthlyPayment : 0), 0)
    const healthMonthlyPrepayment = 3361

    const healthActualBase = Math.max((totalIncome - totalExpanses - incomeTaxDeduction) * 0.5, healthMinimalBase)
    const healthTotal = Math.ceil(healthActualBase * healthRate) - healthDiscount
    const healthPaid = -documents.reduce((p, c) => p + c.healthInsurance, 0)
    const healthMissing = healthTotal - healthPaid - currentBalance.healthInsuranceDeposit - currentBalance.healthInsurancePrepayment
    const healthCurrentMonthPrepayment = healthReduced(date.getMonth(now.date)) ? 0 : healthMonthlyPrepayment
    const healthNextMonthPrepayment = healthReduced(date.getMonth(date.addMonths(now.date, 1))) ? 0 : healthMonthlyPrepayment
    const healthNewPrepayment = Math.max(
      0,
      healthCurrentMonthPrepayment + healthNextMonthPrepayment - currentBalance.healthInsurancePrepayment
    )
    const healthNewDeposit = Math.max(0, healthMissing - healthNewPrepayment)

    console.log(`Health Insurance 2020`)
    console.log('=======')
    console.log(`Insurance to be paid:\t\t\t\t${n(healthTotal)}`)
    console.log(`Insurance paid:\t\t\t\t\t${n(healthPaid)}`)
    console.log(`Insurance deposit:\t\t\t\t${n(currentBalance.healthInsuranceDeposit + currentBalance.healthInsurancePrepayment)}`)
    console.log('-------')
    console.log(`- Health Insurace Prepayment - ${date.format(now.date, 'MMMM y')}:\t${n(healthCurrentMonthPrepayment)}`)
    console.log(`- Health Insurace Prepayment - ${date.format(date.addMonths(now.date, 1), 'MMMM y')}:\t${n(healthNextMonthPrepayment)}`)
    console.log('-------')
    console.log(
      `Missing value:\t\t\t\t\t${n(healthNewDeposit + healthNewPrepayment)}${
        healthMissing < healthNewDeposit + healthNewPrepayment ? ` (actual ${n(healthMissing)})` : ''
      }`
    )
    console.log(`- Health Insurance Deposit:\t\t\t${n(healthNewDeposit)}`)
    console.log(`- Health Insurance Prepayment:\t\t\t${n(healthNewPrepayment)}`)
    console.log()

    const lastIncome = (i => i[i.length - 1])(documents.filter(d => d.id === 'INVOICE')).income
    const usableIncome = lastIncome - incomeTaxNewDeposit - socialNewDeposit - socialNewPrepayment - healthNewDeposit - healthNewPrepayment
    const reservedIncome =
      usableIncome < liveExpansesMinimum
        ? usableIncome
        : usableIncome < liveExpansesMinimum * 2
        ? liveExpansesMinimum * 1.5
        : usableIncome < liveExpansesMinimum * 3
        ? liveExpansesMinimum * 2.2
        : liveExpansesMinimum * 3
    const bufferMax = Math.ceil((usableIncome - reservedIncome) / 3)

    console.log('Buffer Changes')
    console.log(`=======\t\t\t\t\t\t${'Desired'.padStart(15)}\t\t${'Current'.padStart(15)}\t\t${'Contribution'.padStart(15)}`)

    const incomeBufferDesired = currentQuarterPlan * 0.75
    const incomeBufferCurrent = currentBalance.bufferIncome
    const incomeBufferContribution = Math.round(Math.min(incomeBufferDesired - incomeBufferCurrent, bufferMax))

    console.log(`Income\t\t\t\t\t\t${n(incomeBufferDesired)}\t\t${n(incomeBufferCurrent)}\t\t${n(incomeBufferContribution)}`)

    const performanceBufferDesired = currentMonthPlan - lastIncome
    const performanceBufferMax = currentMonthPlan * 1.1
    const performanceBufferCurrent = currentBalance.bufferPerfomance
    const performanceBufferContribution =
      performanceBufferDesired < 0
        ? Math.round(
            Math.min(
              performanceBufferMax,
              Math.min(-performanceBufferDesired, bufferMax / (performanceBufferCurrent > performanceBufferMax * 0.5 ? 2 : 1))
            )
          )
        : Math.round(Math.min(Math.min(performanceBufferDesired, bufferMax)), performanceBufferCurrent)

    console.log(
      `Performance\t\t\t\t\t${n(performanceBufferDesired)}\t\t${n(performanceBufferCurrent)}\t\t${n(performanceBufferContribution)}`
    )

    const healthBufferDesired = Math.round(
      [
        ...[2, 3].map(m => now.month + m).map(m => (healthReduced(m) ? 0 : healthMonthlyPrepayment)),
        ...[4, 5].map(m => now.month + m).map(m => (healthReduced(m) ? 0 : healthMonthlyPrepayment * 0.5))
      ].reduce((p, c) => p + c, 0)
    )
    const healthBufferCurrent = currentBalance.healthInsuranceBuffer
    const healthBufferContribution =
      healthBufferDesired - healthBufferCurrent < 0
        ? healthBufferDesired - healthBufferCurrent
        : Math.min(bufferMax, healthBufferDesired - healthBufferCurrent)

    console.log(`Health Insurance\t\t\t\t${n(healthBufferDesired)}\t\t${n(healthBufferCurrent)}\t\t${n(healthBufferContribution)}`)

    const socialBufferDesired = Math.round(
      [
        ...[2, 3].map(m => now.month + m).map(m => (healthReduced(m) ? 0 : configuration.social.presribedMonthlyPayment)),
        ...[4, 5].map(m => now.month + m).map(m => (healthReduced(m) ? 0 : configuration.social.presribedMonthlyPayment * 0.5))
      ].reduce((p, c) => p + c, 0)
    )
    const socialBufferCurrent = currentBalance.socialInsuranceBuffer
    const socialBufferContribution =
      socialBufferDesired - socialBufferCurrent < 0
        ? socialBufferDesired - socialBufferCurrent
        : Math.min(bufferMax, socialBufferDesired - socialBufferCurrent)

    console.log(`Social Insurance\t\t\t\t${n(socialBufferDesired)}\t\t${n(socialBufferCurrent)}\t\t${n(socialBufferContribution)}`)
    console.log()

    const getPositive = v => (v > 0 ? v : 0)

    console.log('Summary')
    console.log('=======')
    console.log(
      `Business Bank Balance:\t\t\t\t${n(
        businessCashMinimum +
          currentBalance.incomeTaxDeposit +
          incomeTaxNewDeposit +
          currentBalance.socialInsuranceDeposit +
          socialNewDeposit +
          currentBalance.socialInsurancePrepayment +
          socialNewPrepayment +
          currentBalance.healthInsuranceDeposit +
          healthNewDeposit +
          currentBalance.healthInsurancePrepayment +
          healthNewPrepayment
      )}`
    )
    console.log(`[YNAB] Income Tax - Deposit:\t\t\t${n(incomeTaxNewDeposit)}`)
    console.log(`[YNAB] Social Insurance - Deposit:\t\t${n(socialNewDeposit)}`)
    console.log(`[YNAB] Social Insurance - Prepayment:\t\t${n(socialNewPrepayment)}`)
    console.log(`[YNAB] Health Insurance - Deposit:\t\t${n(healthNewDeposit)}`)
    console.log(`[YNAB] Health Insurance - Prepayment:\t\t${n(healthNewPrepayment)}`)
    console.log(`[YNAB] Buffer - Income:\t\t\t\t${n(incomeBufferContribution)}`)
    console.log(`[YNAB] Buffer - Performance:\t\t\t${n(performanceBufferContribution)}`)
    console.log(`[YNAB] Buffer - Social Insurance:\t\t${n(socialBufferContribution)}`)
    console.log(`[YNAB] Buffer - Health Insurance:\t\t${n(healthBufferContribution)}`)
    console.log(
      `[i] Net Profit:\t\t\t\t\t${n(
        usableIncome -
          incomeTaxNewDeposit -
          socialNewDeposit -
          socialNewPrepayment -
          healthNewDeposit -
          incomeBufferContribution -
          performanceBufferContribution -
          healthNewPrepayment -
          socialBufferContribution -
          healthBufferContribution
      )}`
    )
    console.log(
      `[i] Usable Income:\t\t\t\t${n(
        usableIncome +
          getPositive(-incomeBufferContribution) +
          getPositive(-performanceBufferContribution) +
          getPositive(-socialBufferContribution) +
          getPositive(-healthBufferContribution)
      )}`
    )
  })
