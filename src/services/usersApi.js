const STORAGE_KEYS = {
  users: 'helpme-users',
  tasks: 'helpme-tasks',
}

const seedUsers = [
  {
    id: 'user-laura',
    name: 'Laura Moreno',
    ratings: [5, 5, 4, 5, 5, 4, 5, 5],
    avatar: 'https://i.pravatar.cc/120?img=47',
    completedTasks: 12,
  },
  {
    id: 'user-diego',
    name: 'Diego Ruiz',
    ratings: [5, 4, 5, 5, 4, 5, 5, 4, 5],
    avatar: 'https://i.pravatar.cc/120?img=12',
    completedTasks: 20,
  },
  {
    id: 'user-ines',
    name: 'Ines Salas',
    ratings: [5, 5, 5, 5, 4, 5, 5],
    avatar: 'https://i.pravatar.cc/120?img=32',
    completedTasks: 8,
  },
  {
    id: 'user-mario',
    name: 'Mario Garcia',
    ratings: [5, 5, 5, 4, 5, 5, 5, 5, 4, 5],
    avatar: 'https://i.pravatar.cc/120?img=68',
    completedTasks: 18,
  },
]

const seedTasks = [
  {
    id: 'dog-walk',
    title: 'Sacar al perro 30 min',
    description: 'Paseo corto por Delicias. El perro es tranquilo y lleva arnes.',
    distance: 0.8,
    urgency: 'Ahora',
    price: 5,
    category: 'Mascotas',
    userId: 'user-laura',
    location: { latitude: 41.6577, longitude: -0.9078 },
  },
  {
    id: 'package',
    title: 'Recoger un paquete',
    description: 'Recogida en punto cercano y entrega en casa antes de las 18:00.',
    distance: 1.2,
    urgency: 'Hoy',
    price: 7,
    category: 'Recados',
    userId: 'user-diego',
    location: { latitude: 41.6501, longitude: -0.8927 },
  },
  {
    id: 'shopping',
    title: 'Compra rapida',
    description: 'Traer leche, pan y fruta desde el supermercado de la avenida.',
    distance: 0.5,
    urgency: 'Flexible',
    price: 4,
    category: 'Compras',
    userId: 'user-ines',
    location: { latitude: 41.6444, longitude: -0.9008 },
  },
  {
    id: 'router-help',
    title: 'Configurar router Wi-Fi',
    description: 'Necesito ayuda para cambiar la clave y revisar la senal.',
    distance: 0.3,
    urgency: 'Buscando',
    price: 10,
    category: 'Ayuda tecnica',
    userId: 'user-mario',
    owner: true,
    location: { latitude: 41.6538, longitude: -0.9051 },
  },
]

function readFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function writeToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function ensureSeedData() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    writeToStorage(STORAGE_KEYS.users, seedUsers)
  }

  if (!localStorage.getItem(STORAGE_KEYS.tasks)) {
    writeToStorage(STORAGE_KEYS.tasks, seedTasks)
  }
}

export function getUsers() {
  ensureSeedData()
  return readFromStorage(STORAGE_KEYS.users, seedUsers).map(normalizeUser)
}

export function getTasks() {
  ensureSeedData()
  const users = getUsers()
  const tasks = readFromStorage(STORAGE_KEYS.tasks, seedTasks)

  return tasks.map((task) => ({
    ...task,
    location: task.location || getSeedTaskLocation(task.id),
    user: users.find((user) => user.id === task.userId),
  }))
}

function getSeedTaskLocation(taskId) {
  return seedTasks.find((task) => task.id === taskId)?.location || seedTasks[0].location
}

export function saveUser(user) {
  const users = getUsers()
  const normalizedUser = normalizeUser(user)
  const nextUsers = users.some((item) => item.id === normalizedUser.id)
    ? users.map((item) => (item.id === normalizedUser.id ? normalizedUser : item))
    : [...users, normalizedUser]

  writeToStorage(STORAGE_KEYS.users, nextUsers)
  return normalizedUser
}

export function addUserRating(userId, rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating)))
  const users = getUsers()
  const nextUsers = users.map((user) => {
    if (user.id !== userId) {
      return user
    }

    return normalizeUser({
      ...user,
      ratings: [...user.ratings, safeRating],
    })
  })

  writeToStorage(STORAGE_KEYS.users, nextUsers)
  return nextUsers.find((user) => user.id === userId)
}

export function getUserById(userId) {
  return getUsers().find((user) => user.id === userId)
}

function normalizeUser(user) {
  const ratings = Array.isArray(user.ratings) && user.ratings.length > 0
    ? user.ratings.map(Number).filter((rating) => rating >= 1 && rating <= 5)
    : createRatingsFromLegacyAverage(user.rating)

  const averageRating = calculateAverageRating(ratings)

  return {
    ...user,
    ratings,
    rating: averageRating,
    ratingCount: ratings.length,
  }
}

function calculateAverageRating(ratings) {
  if (!ratings.length) {
    return 0
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0)
  return Number((total / ratings.length).toFixed(1))
}

function createRatingsFromLegacyAverage(legacyRating) {
  const rating = Number(legacyRating)

  if (!rating) {
    return []
  }

  return Array.from({ length: 5 }, () => rating)
}
