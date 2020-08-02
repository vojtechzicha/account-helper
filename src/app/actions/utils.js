export const resolveAllAndFlatten = async arr => (await Promise.all(arr)).reduce((p, c) => [...p, ...c], [])

export const roundHundredDown = value => Math.floor(value / 100) * 100
export const roundHundredUp = value => Math.ceil(value / 100) * 100

export const formatCurrency = n => n.toLocaleString('cs-CZ') + ' Kč'
export const reducerJoinLines = (p, c, i) => p + `${i === 0 ? '' : '\n'}${c}`

export const sumFirst = (arr, n) => arr.reduce((p, c, i) => (i < n ? p + c : p), 0)
