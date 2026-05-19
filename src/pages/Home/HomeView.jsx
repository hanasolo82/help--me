import styles from './Home.module.css'
import HomeHeader from '../../components/home/HomeHeader'
import ModeSwitcher from '../../components/home/ModeSwitcher'
import ChatsModal from '../../components/home/ChatsModal'
import TaskChatModal from '../../components/home/TaskChatModal'
import NeedHelpMapLayout from '../../features/home/need-help/components/NeedHelpMapLayout'
import OfferHelpMapLayout from '../../features/home/offer-help/components/OfferHelpMapLayout'

export default function HomeView({
  profile,
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
  isHelperMode,
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
  location,
  locationStatus,
  locationError,
  onRequestNeedLocation,
  userAvatarUrl,
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
    <main className={isHelperMode ? styles.home : `${styles.home} ${styles.homeWide}`}>
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

      {isHelperMode ? (
        <OfferHelpMapLayout
          profile={profile}
          location={location}
          userAvatarUrl={userAvatarUrl}
          userInitial={userInitial}
          radiusKm={radius}
          visibleTasks={visibleTasks}
          isLoading={isTasksLoading}
          error={tasksError}
          distancesById={distancesById}
          currentUserId={currentUserId}
          expandedTaskIds={expandedTaskIds}
          publishingTaskId={publishingTaskId}
          onToggleTaskDetails={onToggleTaskDetails}
          onPublishTask={onPublishTask}
          onCancelTask={onCancelTask}
          onOpenTaskChat={onOpenTaskChat}
          onEditTask={onEditTask}
          category={category}
          onCategoryChange={onCategoryChange}
          categories={categories}
          radius={radius}
          onRadiusChange={onRadiusChange}
          radiusOptions={radiusOptions}
        />
      ) : (
        <NeedHelpMapLayout
          profile={profile}
          location={location}
          locationStatus={locationStatus}
          locationError={locationError}
          onRequestLocation={onRequestNeedLocation}
        />
      )}

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
