import styles from './Home.module.css'
import HomeHeader from '../../components/home/HomeHeader'
import ModeSwitcher from '../../components/home/ModeSwitcher'
import CategoryFilter from '../../components/home/CategoryFilter'
import RadiusFilter from '../../components/home/RadiusFilter'
import HomeMap from '../../components/home/HomeMap'
import TaskFeed from '../../components/home/TaskFeed'
import ChatsModal from '../../components/home/ChatsModal'
import TaskChatModal from '../../components/home/TaskChatModal'

export default function HomeView({
  locationLabel,
  displayName,
  avatarUrl,
  userInitial,
  onOpenChats,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  mode,
  onModeChange,
  category,
  onCategoryChange,
  radius,
  onRadiusChange,
  categories,
  radiusOptions,
  helperTitle,
  helperSubtitle,
  isHelperMode,
  onOpenMap,
  onOpenCreateTask,
  visibleTasks,
  isTasksLoading,
  tasksError,
  distancesById,
  currentUserId,
  expandedTaskIds,
  publishingTaskId,
  onToggleTaskDetails,
  onPublishTask,
  onCancelTask,
  onOpenTaskChat,
  onEditTask,
  showMap,
  showLocationPanel,
  location,
  locationStatus,
  locationError,
  showApproxLocation,
  userAvatarUrl,
  radiusKm,
  onCloseMap,
  onRequestLocation,
  onClearLocation,
  onDismissLocationPanel,
  chats,
  isChatsLoading,
  chatsError,
  showChatsModal,
  onCloseChatsModal,
  showTaskChatModal,
  activeTaskChat,
  onCloseTaskChat,
}) {
  return (
    <main className={styles.home}>
      <HomeHeader
        locationLabel={locationLabel}
        displayName={displayName}
        avatarUrl={avatarUrl}
        userInitial={userInitial}
        onOpenChats={onOpenChats}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />

      <ModeSwitcher mode={mode} onChange={onModeChange} />

      <section className={styles.filters} aria-label="Filtros de tareas">
        <CategoryFilter category={category} onChange={onCategoryChange} options={categories} />
        <RadiusFilter radius={radius} onChange={onRadiusChange} options={radiusOptions} />
      </section>

      <TaskFeed
        title={helperTitle}
        subtitle={helperSubtitle}
        actionLabel={isHelperMode ? 'Mapa' : 'Nueva tarea'}
        onAction={isHelperMode ? onOpenMap : onOpenCreateTask}
        tasks={visibleTasks}
        loading={isTasksLoading}
        error={tasksError}
        count={visibleTasks.length}
        isHelperMode={isHelperMode}
        currentUserId={currentUserId}
        expandedTaskIds={expandedTaskIds}
        publishingTaskId={publishingTaskId}
        distancesById={distancesById}
        onToggleTaskDetails={onToggleTaskDetails}
        onPublishTask={onPublishTask}
        onCancelTask={onCancelTask}
        onOpenTaskChat={onOpenTaskChat}
        onEditTask={onEditTask}
      />

      <HomeMap
        open={showMap}
        showLocationPanel={showLocationPanel}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        showApproxLocation={showApproxLocation}
        userAvatarUrl={userAvatarUrl}
        userInitial={userInitial}
        radiusKm={radiusKm}
        tasks={visibleTasks}
        distancesById={distancesById}
        onClose={onCloseMap}
        onRequestLocation={onRequestLocation}
        onClearLocation={onClearLocation}
        onDismissLocationPanel={onDismissLocationPanel}
      />

      <ChatsModal
        open={showChatsModal}
        chats={chats}
        loading={isChatsLoading}
        error={chatsError}
        currentUserId={currentUserId}
        onClose={onCloseChatsModal}
      />

      <TaskChatModal
        key={showTaskChatModal ? activeTaskChat?.id || 'task-chat' : 'task-chat-closed'}
        open={showTaskChatModal}
        task={activeTaskChat}
        onClose={onCloseTaskChat}
      />
    </main>
  )
}
