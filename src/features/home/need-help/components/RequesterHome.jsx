import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import NeedHelpMapLayout from './NeedHelpMapLayout'
import HelperPreviewModal from './HelperPreviewModal'
import RequestTaskModal from './RequestTaskModal'
import RequesterHero from './RequesterHero'
import MyRequestsDrawer from './MyRequestsDrawer'
import { cancelTask, getMyTasks } from '../../../../services/tasksService'
import { createOrGetDirectConversation } from '../../../../services/chatService'
import styles from './RequesterHome.module.css'

export default function RequesterHome({
  profile,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
  requestsDrawerOpen = false,
  onCloseRequestsDrawer,
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [heroQuery, setHeroQuery] = useState('')
  const [preferredView, setPreferredView] = useState('map')
  const [selectedHelper, setSelectedHelper] = useState(null)
  const [requestTaskOpen, setRequestTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedRequesterTaskId, setSelectedRequesterTaskId] = useState(null)
  const [focusRequesterTaskId, setFocusRequesterTaskId] = useState(null)
  const [mapViewEpoch, setMapViewEpoch] = useState(0)
  const [publishNotice, setPublishNotice] = useState('')
  const [contactError, setContactError] = useState('')
  const [draftTaskTitle, setDraftTaskTitle] = useState('')
  const myTasksQuery = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: () => getMyTasks(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 15_000,
  })

  const retireTaskMutation = useMutation({
    mutationFn: (task) => cancelTask(task.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-tasks', profile?.id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      setSelectedRequesterTaskId(null)
      setFocusRequesterTaskId(null)
    },
  })

  function handlePreviewHelper(helper) {
    setSelectedHelper(helper)
  }

  async function handleContactHelper(helper) {
    if (!helper?.id) return

    setContactError('')

    try {
      const conversationId = await createOrGetDirectConversation(helper.id)
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      setContactError(error?.message || 'No hemos podido abrir la conversación. Inténtalo de nuevo.')
    }
  }

  function handleOpenTaskModal() {
    setSelectedHelper(null)
    setEditingTask(null)
    setDraftTaskTitle(heroQuery.trim())
    setHeroQuery('')
    setRequestTaskOpen(true)
  }

  function handleCloseRequestsDrawer() {
    onCloseRequestsDrawer?.()
  }

  function handleEditTask(task) {
    setSelectedHelper(null)
    setEditingTask(task)
    setRequestTaskOpen(true)
  }

  function handleFocusTask(task) {
    if (!task) return
    setPreferredView('map')
    setMapViewEpoch((value) => value + 1)
    setSelectedRequesterTaskId(task.id)
    setFocusRequesterTaskId(task.id)
  }

  function handleRetireTask(task) {
    if (!task) return

    const shouldRetire = window.confirm(
      '¿Quieres retirar esta solicitud?\n\nDejará de aparecer para los ayudantes, pero seguirá en tu historial.',
    )

    if (!shouldRetire) {
      return
    }

    retireTaskMutation.mutate(task)
  }

  function handleSavedTask(task) {
    setRequestTaskOpen(false)
    setEditingTask(null)
    setPublishNotice('Solicitud publicada')
    setFocusRequesterTaskId(task?.id || null)
    setSelectedRequesterTaskId(task?.id || null)
    setPreferredView('map')

    queryClient.invalidateQueries({ queryKey: ['my-tasks', profile?.id] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  function handleOpenChat(task) {
    navigate(`/task/${task.id}`, { state: { openChat: true } })
  }

  function handleOpenDetail(task) {
    navigate(`/task/${task.id}`)
  }

  function handleOpenSummary(task) {
    navigate(`/task/${task.id}`)
  }

  function handleReview(task) {
    if (task?.accepted_profile?.id) {
      navigate(`/profile/${task.accepted_profile.id}`)
    }
  }

  return (
    <section className={styles.requesterShell}>
      <RequesterHero
        value={heroQuery}
        onChange={setHeroQuery}
        onPublishRequest={handleOpenTaskModal}
      />

      {publishNotice ? (
        <section className={styles.publishNotice}>
          <strong>{publishNotice}</strong>
          <p className="muted">
            {publishNotice === 'Solicitud publicada'
              ? 'Ya es visible para ayudantes cercanos.'
              : 'Tu solicitud quedó publicada y centrada en el mapa.'}
          </p>
        </section>
      ) : null}

      {contactError ? (
        <p className="auth-message error" role="alert">
          {contactError}
        </p>
      ) : null}

        {!location && locationStatus !== 'loading' ? (
          <div className={styles.locationHint}>
            <strong>Activa tu ubicación para ver personas cercanas.</strong>
            <p className="muted">
              Con tu ubicación podemos mostrar personas disponibles por cercanía y ordenar mejor los resultados.
            </p>
          {onRequestLocation ? (
            <button type="button" className="secondary-action" onClick={onRequestLocation}>
              Usar mi ubicación
            </button>
          ) : null}
        </div>
      ) : null}

      <NeedHelpMapLayout
        key={mapViewEpoch}
        profile={profile}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        onRequestLocation={onRequestLocation}
        preferredMobileView={preferredView}
        onPreviewHelper={handlePreviewHelper}
        onPublishRequest={handleOpenTaskModal}
        requesterTasks={myTasksQuery.data || []}
        selectedRequesterTaskId={selectedRequesterTaskId}
        onSelectRequesterTask={handleFocusTask}
        focusRequesterTaskId={focusRequesterTaskId}
        onContact={handleContactHelper}
      />

      <MyRequestsDrawer
        open={requestsDrawerOpen}
        tasks={myTasksQuery.data || []}
        onClose={handleCloseRequestsDrawer}
        onFocusMap={handleFocusTask}
        onEdit={handleEditTask}
        onRetire={handleRetireTask}
        onOpenChat={handleOpenChat}
        onOpenDetail={handleOpenDetail}
        onOpenSummary={handleOpenSummary}
        onReview={handleReview}
      />

      <HelperPreviewModal
        open={Boolean(selectedHelper)}
        helper={selectedHelper}
        onClose={() => setSelectedHelper(null)}
        onViewProfile={(helper) => navigate(`/profile/${helper.id}`)}
        onContact={handleContactHelper}
        onSendProposal={() => {
          handleOpenTaskModal()
        }}
      />

      <RequestTaskModal
        open={requestTaskOpen}
        task={editingTask}
        initialTitle={draftTaskTitle}
        location={location}
        locationStatus={locationStatus}
        onRequestLocation={onRequestLocation}
        onSaved={handleSavedTask}
        onClose={() => {
          setRequestTaskOpen(false)
          setEditingTask(null)
          setDraftTaskTitle('')
        }}
      />
    </section>
  )
}
