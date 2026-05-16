import { uploadFileToBucket } from '../utils/uploadFile'

export async function uploadTaskImage(file) {
  return uploadFileToBucket('task-images', file)
}

export async function uploadAvatar(file) {
  return uploadFileToBucket('avatars', file, { scope: 'avatar' })
}

export async function uploadMapAvatar(file) {
  return uploadFileToBucket('map-avatars', file, { scope: 'map-avatar' })
}

// Alias conservado para no romper imports antiguos.
export async function uploadProfileAsset(file, scope = 'profile-assets') {
  return uploadFileToBucket('avatars', file, { scope })
}
