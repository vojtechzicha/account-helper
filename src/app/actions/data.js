import axios from 'axios'

export const getInvoices = async (year, ynabConfig) =>
  (await getYnab(`budgets/BUDGET_ID/transactions?since_date=${year}-01-01`, ynabConfig)).data.transactions
    .filter(t => t.date.substring(0, 4) === year.toString() && t.memo && t.memo.includes('[INV]') && !t.deleted && t.approved)
    .map(t => ({
      date: new Date(t.date),
      amount:
        t.subtransactions.length > 0
          ? t.subtransactions.filter(st => st.category_name !== ynabConfig.categories.vatIncome).reduce((pr, cu) => pr + cu.amount, 0) /
            1000
          : t.amount / 1000,
      vatAmount:
        t.subtransactions.length > 0 ? t.subtransactions.find(st => st.category_name === ynabConfig.categories.vatIncome).amount / 1000 : 0,
      number: t.memo.substring(5).trim()
    }))

export const getTransfers = async (year, id, ynabConfig) => {
  const memo = `[T-${id}-${year}]`
  return (await getYnab(`budgets/BUDGET_ID/transactions?since_date=${year}-01-01`, ynabConfig)).data.transactions
    .filter(t => t.date.substring(0, 4) === year.toString() && t.memo && t.memo.includes(memo) && !t.deleted)
    .map(t => ({
      date: new Date(t.date),
      amount: t.amount / 1000,
      number: t.memo.substring(memo.length).trim()
    }))
}

export const getBalance = async (category, ynabConfig) =>
  (await getYnab(`budgets/BUDGET_ID/categories`, ynabConfig)).data.category_groups
    .reduce((p, c) => [...p, ...c.categories], [])
    .find(c => c.name === category).balance / 1000

const getYnab = async (uri, ynabConfig) =>
  (
    await axios.get(`https://api.youneedabudget.com/v1/${uri.replace('BUDGET_ID', ynabConfig.budgetId)}`, {
      headers: { Authorization: `Bearer ${ynabConfig.pat}` }
    })
  ).data
