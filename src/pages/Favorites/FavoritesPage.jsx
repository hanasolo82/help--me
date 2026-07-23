import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Heart, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTransitionNavigate } from '../../shared/navigation/usePageTransition'
import { toggleFavoriteProfile } from '../../features/profile/api/profileApi'
import {
  favoriteProfileIdsQueryKey,
  favoriteProfilesQueryKey,
  useFavoriteProfiles,
} from '../../features/profile/hooks/useFavoriteProfiles'
import { useAuth } from '../../contexts/useAuth'
import FavoriteProfileCard from '../../features/profile/components/FavoriteProfileCard'
import styles from './FavoritesPage.module.css'

const EXIT_DURATION_MS = 180

export default function FavoritesPage() {
  const navigate = useNavigate()
  const transitionNavigate = useTransitionNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const favoriteIdsKey = favoriteProfileIdsQueryKey(userId)
  const favoriteProfilesKey = favoriteProfilesQueryKey(userId)
  const favoritesQuery = useFavoriteProfiles()
  const [removingIds, setRemovingIds] = useState([])
  const [undoProfile, setUndoProfile] = useState(null)
  const [feedback, setFeedback] = useState('')
  const removalTimers = useRef(new Map())

  useEffect(() => () => {
    for (const timer of removalTimers.current.values()) {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!undoProfile) return undefined

    const timer = window.setTimeout(() => setUndoProfile(null), 5000)
    return () => window.clearTimeout(timer)
  }, [undoProfile])

  const removeFavorite = useMutation({
    mutationFn: (profile) => toggleFavoriteProfile(profile.id),
    onMutate: async (profile) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: favoriteIdsKey }),
        queryClient.cancelQueries({ queryKey: favoriteProfilesKey }),
      ])

      const previousIds = queryClient.getQueryData(favoriteIdsKey)
      const previousProfiles = queryClient.getQueryData(favoriteProfilesKey)
      queryClient.setQueryData(
        favoriteIdsKey,
        (current = []) => current.filter((profileId) => profileId !== profile.id),
      )
      queryClient.setQueryData(
        favoriteProfilesKey,
        (current = []) => current.filter((item) => item.id !== profile.id),
      )

      return { previousIds, previousProfiles }
    },
    onError: (_error, profile, context) => {
      queryClient.setQueryData(favoriteIdsKey, context?.previousIds)
      queryClient.setQueryData(favoriteProfilesKey, context?.previousProfiles)
      setFeedback(`No hemos podido quitar a ${profile.full_name || 'esta persona'} de favoritos.`)
    },
    onSuccess: (_result, profile) => {
      setUndoProfile(profile)
      setFeedback('')
    },
    onSettled: async (_result, _error, profile) => {
      setRemovingIds((current) => current.filter((id) => id !== profile.id))
      removalTimers.current.delete(profile.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: favoriteIdsKey }),
        queryClient.invalidateQueries({ queryKey: favoriteProfilesKey }),
        queryClient.invalidateQueries({ queryKey: ['profile', profile.id] }),
      ])
    },
  })

  const restoreFavorite = useMutation({
    mutationFn: (profile) => toggleFavoriteProfile(profile.id),
    onMutate: async (profile) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: favoriteIdsKey }),
        queryClient.cancelQueries({ queryKey: favoriteProfilesKey }),
      ])

      const previousIds = queryClient.getQueryData(favoriteIdsKey)
      const previousProfiles = queryClient.getQueryData(favoriteProfilesKey)
      queryClient.setQueryData(favoriteIdsKey, (current = []) => [profile.id, ...current.filter((id) => id !== profile.id)])
      queryClient.setQueryData(favoriteProfilesKey, (current = []) => [profile, ...current.filter((item) => item.id !== profile.id)])

      return { previousIds, previousProfiles }
    },
    onError: (_error, _profile, context) => {
      queryClient.setQueryData(favoriteIdsKey, context?.previousIds)
      queryClient.setQueryData(favoriteProfilesKey, context?.previousProfiles)
      setFeedback('No hemos podido restaurar el favorito.')
    },
    onSuccess: () => {
      setUndoProfile(null)
      setFeedback('')
    },
    onSettled: async (_result, _error, profile) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: favoriteIdsKey }),
        queryClient.invalidateQueries({ queryKey: favoriteProfilesKey }),
        queryClient.invalidateQueries({ queryKey: ['profile', profile.id] }),
      ])
    },
  })

  function handleRemove(profile) {
    if (removeFavorite.isPending || removingIds.includes(profile.id)) return

    setUndoProfile(null)
    setRemovingIds((current) => [...current, profile.id])
    const timer = window.setTimeout(() => removeFavorite.mutate(profile), EXIT_DURATION_MS)
    removalTimers.current.set(profile.id, timer)
  }

  function handleUndo() {
    if (!undoProfile || restoreFavorite.isPending) return
    restoreFavorite.mutate(undoProfile)
  }

  function handleRequestHelp(profile) {
    transitionNavigate('/home', {
      state: {
        mode: 'need',
        directHelper: profile,
        returnTo: '/favorites',
      },
    })
  }

  function handleViewProfile(profile) {
    transitionNavigate(`/profile/${profile.id}`, { state: { returnTo: '/favorites' } })
  }

  const favorites = favoritesQuery.data ?? []

  return (
    <main className={`app-screen with-nav ${styles.page}`}>
      <header className={`page-header ${styles.header}`}>
        <button type="button" className="icon-button" onClick={() => transitionNavigate('/home', { direction: 'back' })} aria-label="Volver a inicio">
          <ArrowLeft aria-hidden="true" strokeWidth={2.1} />
        </button>
        <div className={styles.headerCopy}>
          <p className="eyebrow">Favoritos</p>
          <h1>Personas de confianza</h1>
          <p className="muted">Vuelve a pedir ayuda o contactar sin tener que buscarlas otra vez.</p>
        </div>
      </header>

      {feedback ? <p className="auth-message error" role="alert">{feedback}</p> : null}

      {favoritesQuery.isPending ? (
        <section className={styles.grid} aria-label="Cargando favoritos">
          {[0, 1, 2, 3].map((item) => <div key={item} className={styles.skeleton} aria-hidden="true" />)}
        </section>
      ) : null}

      {!favoritesQuery.isPending && favoritesQuery.isError ? (
        <section className={styles.empty}>
          <h2>No pudimos cargar tus favoritos</h2>
          <p className="muted">Inténtalo de nuevo en un momento.</p>
          <button type="button" className="secondary-action" onClick={() => favoritesQuery.refetch()}>
            <RefreshCw aria-hidden="true" strokeWidth={2.1} />
            Reintentar
          </button>
        </section>
      ) : null}

      {!favoritesQuery.isPending && !favoritesQuery.isError && favorites.length === 0 ? (
        <section className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><Heart strokeWidth={1.8} /></span>
          <h2>Todavía no has guardado a nadie</h2>
          <p className="muted">Usa el corazón en una persona para encontrarla fácilmente después.</p>
          <button type="button" className="primary-action" onClick={() => navigate('/home')}>
            Explorar personas
          </button>
        </section>
      ) : null}

      {favorites.length > 0 ? (
        <section className={styles.grid} aria-label="Personas guardadas">
          {favorites.map((profile) => (
            <FavoriteProfileCard
              key={profile.id}
              profile={profile}
              isRemoving={removingIds.includes(profile.id)}
              onRemove={handleRemove}
              onRequestHelp={handleRequestHelp}
              onViewProfile={handleViewProfile}
            />
          ))}
        </section>
      ) : null}

      {undoProfile ? (
        <aside className={styles.undoNotice} role="status" aria-live="polite">
          <span>Eliminado de favoritos.</span>
          <button type="button" onClick={handleUndo} disabled={restoreFavorite.isPending}>
            {restoreFavorite.isPending ? 'Restaurando...' : 'Deshacer'}
          </button>
        </aside>
      ) : null}
    </main>
  )
}
