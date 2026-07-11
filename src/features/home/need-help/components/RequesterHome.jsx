import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTransitionNavigate } from '../../../../shared/navigation/usePageTransition'
import NeedHelpMapLayout from './NeedHelpMapLayout'
import HelperPreviewModal from './HelperPreviewModal'
import RequestTaskModal from './RequestTaskModal'
import RequesterHero from './RequesterHero'
import MyRequestsDrawer from './MyRequestsDrawer'
import { cancelTask, getMyTasks } from '../../../../services/tasksService'
import { getMyReviewsForTasks } from '../../../reviews/api/reviewsApi'
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
  const transitionNavigate = useTransitionNavigate()
  const queryClient = useQueryClient()
  const [heroQuery, setHeroQuery] = useState('')
  const [preferredView, setPreferredView] = useState('map')
  const [selectedHelper, setSelectedHelper] = useState(null)
  const [requestTaskOpen, setRequestTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedRequesterTaskId, setSelectedRequesterTaskId] = useState(null)
  const [focusRequesterTaskId, setFocusRequesterTaskId] = useState(null)
  const [contactError, setContactError] = useState('')
  const [draftTaskTitle, setDraftTaskTitle] = useState('')
  const myTasksQuery = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: () => getMyTasks(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 15_000,
  })
  const reviewableTaskIds = (myTasksQuery.data || [])
    .filter((task) => ['completed', 'closed'].includes(task.status) && task.accepted_by)
    .map((task) => task.id)

  const taskReviewsQuery = useQuery({
    queryKey: ['task-reviews', profile?.id, reviewableTaskIds],
    queryFn: () => getMyReviewsForTasks(reviewableTaskIds),
    enabled: Boolean(profile?.id) && reviewableTaskIds.length > 0,
    staleTime: 30_000,
  })
  const reviewedTaskIds = new Set((taskReviewsQuery.data || []).map((review) => review.task_id))

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

  function handleContactHelper(helper) {
    if (!helper?.id) return

    setContactError('')
    setSelectedHelper(null)
    setEditingTask(null)
    setDraftTaskTitle(heroQuery.trim())
    setRequestTaskOpen(true)
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

  // Sin remontar el mapa: cambiamos el foco de la solicitud sin forzar
  // recentrados automáticos, para que el usuario conserve su vista del mapa.
  function handleFocusTask(task) {
    if (!task) return
    setPreferredView('map')
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
    setFocusRequesterTaskId(task?.id || null)
    setSelectedRequesterTaskId(task?.id || null)
    setPreferredView('map')

    queryClient.invalidateQueries({ queryKey: ['my-tasks', profile?.id] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  function handleOpenChat(task) {
    transitionNavigate(`/task/${task.id}`, { state: { openChat: true } })
  }

  function handleOpenDetail(task) {
    transitionNavigate(`/task/${task.id}`)
  }

  function handleOpenSummary(task) {
    transitionNavigate(`/task/${task.id}`)
  }

  function handleReview(task) {
    if (task?.id) {
      navigate(`/task/${task.id}/review`)
    }
  }

  return (
    <section className={styles.requesterShell}>
      <RequesterHero
        value={heroQuery}
        onChange={setHeroQuery}
        onPublishRequest={handleOpenTaskModal}
      />

      <NeedHelpMapLayout
        profile={profile}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        onRequestLocation={onRequestLocation}
        contactError={contactError}
        preferredMobileView={preferredView}
        onPreviewHelper={handlePreviewHelper}
        onPublishRequest={handleOpenTaskModal}
        requesterTasks={myTasksQuery.data || []}
        selectedRequesterTaskId={selectedRequesterTaskId}
        onSelectRequesterTask={handleFocusTask}
        focusRequesterTaskId={focusRequesterTaskId}
        onContact={handleContactHelper}
        onEditRequesterTask={handleEditTask}
        onRetireRequesterTask={handleRetireTask}
        onOpenRequesterTaskDetail={handleOpenDetail}
        retirePending={retireTaskMutation.isPending}
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
        reviewedTaskIds={reviewedTaskIds}
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
