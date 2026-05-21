import HomeHeader from '../../components/home/HomeHeader'
import ChatsModal from '../../components/home/ChatsModal'
import TaskChatModal from '../../components/home/TaskChatModal'
import HomeLayout from '../../shared/ui/layouts/HomeLayout'
import NeedHomeMode from './modes/NeedHomeMode'
import HelperHomeMode from './modes/HelperHomeMode'

export default function HomeView({
  profile,
  locationLabel,
  displayName,
  avatarUrl,
  userInitial,
  onOpenChats,
  onOpenSettings,
  onOpenProfile,
  onOpenHelper,
  onLogout,
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
  onStartHelperOnboarding,
  onNeedHelp,
}) {
  return (
    <HomeLayout
      wide={!isHelperMode}
      header={
        <HomeHeader
          locationLabel={locationLabel}
          displayName={displayName}
          avatarUrl={avatarUrl}
          userInitial={userInitial}
          onOpenHelper={onOpenHelper}
          onOpenChats={onOpenChats}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      }
    >
      {isHelperMode ? (
        <HelperHomeMode
          profile={profile}
          onStartHelperOnboarding={onStartHelperOnboarding}
          onNeedHelp={onNeedHelp}
          helperHomeProps={{
            profile,
            location,
            userAvatarUrl,
            userInitial,
            radiusKm: radius,
            visibleTasks,
            isLoading: isTasksLoading,
            error: tasksError,
            distancesById,
            currentUserId,
            expandedTaskIds,
            publishingTaskId,
            onToggleTaskDetails,
            onPublishTask,
            onCancelTask,
            onOpenTaskChat,
            onEditTask,
            category,
            onCategoryChange,
            categories,
            radius,
            onRadiusChange,
            radiusOptions,
          }}
        />
      ) : (
        <NeedHomeMode
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
    </HomeLayout>
  )
}
