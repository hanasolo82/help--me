export const locations = {
  Madrid: [
    'Madrid',
    'Alcalá de Henares',
    'Alcobendas',
    'Alcorcón',
    'Aranjuez',
    'Arganda del Rey',
    'Boadilla del Monte',
    'Collado Villalba',
    'Coslada',
    'Fuenlabrada',
    'Getafe',
    'Leganés',
    'Majadahonda',
    'Móstoles',
    'Parla',
    'Pozuelo de Alarcón',
    'Rivas-Vaciamadrid',
    'San Sebastián de los Reyes',
    'Torrejón de Ardoz',
    'Valdemoro',
  ],
  Barcelona: [
    'Barcelona',
    'Badalona',
    'Castelldefels',
    'Cornellà de Llobregat',
    'El Prat de Llobregat',
    'Granollers',
    'Hospitalet de Llobregat',
    'Igualada',
    'Manresa',
    'Mataró',
    'Mollet del Vallès',
    'Sabadell',
    'Sant Boi de Llobregat',
    'Sant Cugat del Vallès',
    'Santa Coloma de Gramenet',
    'Terrassa',
    'Vic',
    'Viladecans',
    'Vilanova i la Geltrú',
  ],
  Valencia: [
    'Valencia',
    'Alaquàs',
    'Aldaia',
    'Algemesí',
    'Alzira',
    'Burjassot',
    'Catarroja',
    'Gandía',
    'Manises',
    'Mislata',
    'Ontinyent',
    'Paterna',
    'Quart de Poblet',
    'Sagunto',
    'Sueca',
    'Torrent',
    'Xàtiva',
  ],
  Sevilla: [
    'Sevilla',
    'Alcalá de Guadaíra',
    'Camas',
    'Carmona',
    'Coria del Río',
    'Dos Hermanas',
    'Écija',
    'Lebrija',
    'Mairena del Aljarafe',
    'Morón de la Frontera',
    'San Juan de Aznalfarache',
    'Utrera',
  ],
  Zaragoza: [
    'Zaragoza',
    'Calatayud',
    'Caspe',
    'Cuarte de Huerva',
    'Ejea de los Caballeros',
    'La Almunia de Doña Godina',
    'Tarazona',
    'Utebo',
    'Zuera',
  ],
  Málaga: [
    'Málaga',
    'Antequera',
    'Benalmádena',
    'Estepona',
    'Fuengirola',
    'Marbella',
    'Mijas',
    'Rincón de la Victoria',
    'Ronda',
    'Torremolinos',
    'Vélez-Málaga',
  ],
  Alicante: [
    'Alicante',
    'Alcoy',
    'Benidorm',
    'Crevillente',
    'Dénia',
    'Elche',
    'Elda',
    'Ibi',
    'Jávea',
    'Orihuela',
    'Petrer',
    'San Vicente del Raspeig',
    'Torrevieja',
    'Villajoyosa',
  ],
  Murcia: [
    'Murcia',
    'Águilas',
    'Alcantarilla',
    'Cartagena',
    'Cieza',
    'Jumilla',
    'Lorca',
    'Mazarrón',
    'Molina de Segura',
    'San Javier',
    'Torre-Pacheco',
    'Yecla',
  ],
  Cádiz: [
    'Cádiz',
    'Algeciras',
    'Arcos de la Frontera',
    'Chiclana de la Frontera',
    'El Puerto de Santa María',
    'Jerez de la Frontera',
    'La Línea de la Concepción',
    'Puerto Real',
    'Rota',
    'San Fernando',
    'Sanlúcar de Barrameda',
  ],
  Vizcaya: [
    'Bilbao',
    'Barakaldo',
    'Basauri',
    'Durango',
    'Erandio',
    'Galdakao',
    'Getxo',
    'Leioa',
    'Portugalete',
    'Santurtzi',
    'Sestao',
  ],
}

function normalize(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function levenshteinDistance(a, b) {
  const left = normalize(a)
  const right = normalize(b)

  if (!left) return right.length
  if (!right) return left.length

  const matrix = Array.from({ length: left.length + 1 }, (_, row) => [row])

  for (let col = 1; col <= right.length; col += 1) {
    matrix[0][col] = col
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

function isSimilar(option, query) {
  const normalizedOption = normalize(option)
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) {
    return true
  }

  if (normalizedOption.includes(normalizedQuery) || normalizedQuery.includes(normalizedOption)) {
    return true
  }

  if (normalizedQuery.length <= 2 || normalizedOption.length <= 2) {
    return normalizedOption.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedOption)
  }

  return levenshteinDistance(normalizedOption, normalizedQuery) <= 2
}

export function getProvinceOptions(query = '') {
  return Object.keys(locations).filter((province) => isSimilar(province, query))
}

export function getMunicipalityOptions(province, query = '') {
  const baseOptions = locations[province] || []
  return baseOptions.filter((municipality) => isSimilar(municipality, query))
}

export function findBestProvinceMatch(value) {
  const query = normalize(value)

  if (!query) {
    return ''
  }

  const exactMatch = Object.keys(locations).find((province) => normalize(province) === query)
  if (exactMatch) {
    return exactMatch
  }

  const includesMatch = Object.keys(locations).find(
    (province) => normalize(province).includes(query) || query.includes(normalize(province)),
  )
  if (includesMatch) {
    return includesMatch
  }

  let bestMatch = ''
  let bestScore = Number.POSITIVE_INFINITY

  for (const province of Object.keys(locations)) {
    const score = levenshteinDistance(province, query)
    if (score < bestScore) {
      bestMatch = province
      bestScore = score
    }
  }

  return bestScore <= 2 ? bestMatch : ''
}

export function getDetectedProvince(value) {
  return findBestProvinceMatch(value) || ''
}

export function getProvinceForMunicipality(municipality) {
  const query = normalize(municipality)

  if (!query) {
    return ''
  }

  for (const [province, municipalities] of Object.entries(locations)) {
    if (municipalities.some((item) => normalize(item) === query)) {
      return province
    }
  }

  return ''
}
