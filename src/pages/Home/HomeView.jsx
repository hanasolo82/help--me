import HomeHeader from '../../components/home/HomeHeader'
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
  onOpenFavorites,
  onOpenMyRequests,
  onOpenSettings,
  onOpenPayments,
  onOpenNotifications,
  notificationSummary,
  onReviewAcceptedTask,
  onOpenPrivacy,
  onOpenHelp,
  onOpenProfile,
  onOpenHelper,
  onOpenNeedHelp,
  onLogout,
  themePreference,
  onThemeChange,
  isHelperActive,
  zoneSearch,
  zoneSearchStatus,
  zoneSearchMessage,
  onZoneSearchChange,
  onZoneSearchSubmit,
  helperModeLabel,
  category,
  onCategoryChange,
  categories,
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
  helperLocationSource,
  helperMapLocation,
  userAvatarUrl,
  chats,
  showTaskChatModal,
  activeTaskChat,
  onCloseTaskChat,
  onStartHelperOnboarding,
  onNeedHelp,
  requestsDrawerOpen,
  onOpenRequestsDrawer,
  onCloseRequestsDrawer,
}) {
  return (
    <HomeLayout
      wide
      header={
        <HomeHeader
          locationLabel={locationLabel}
          displayName={displayName}
          avatarUrl={avatarUrl}
          userInitial={userInitial}
          onOpenHelper={onOpenHelper}
          onOpenNeedHelp={onOpenNeedHelp}
          onOpenChats={onOpenChats}
          onOpenFavorites={onOpenFavorites}
          onOpenMyRequests={onOpenMyRequests}
          onOpenSettings={onOpenSettings}
          onOpenPayments={onOpenPayments}
          onOpenNotifications={onOpenNotifications}
          notificationSummary={notificationSummary}
          onReviewAcceptedTask={onReviewAcceptedTask}
          onOpenPrivacy={onOpenPrivacy}
          onOpenHelp={onOpenHelp}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
          themePreference={themePreference}
          onThemeChange={onThemeChange}
          isHelperMode={isHelperMode}
          isHelperActive={isHelperActive}
          zoneSearch={zoneSearch}
          zoneSearchStatus={zoneSearchStatus}
          zoneSearchMessage={zoneSearchMessage}
          onZoneSearchChange={onZoneSearchChange}
          onZoneSearchSubmit={onZoneSearchSubmit}
          helperModeLabel={helperModeLabel}
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
            mapLocation: helperMapLocation,
            locationStatus,
            locationError,
            locationSource: helperLocationSource,
            userAvatarUrl,
            userInitial,
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
            chats,
            onOpenChats,
            onOpenFavorites,
            onOpenSettings,
            onOpenNotifications,
            onOpenPrivacy,
            onOpenHelp,
            onNeedHelp,
            onStartHelperOnboarding,
            onOpenMyRequests,
          }}
        />
      ) : (
        <NeedHomeMode
          profile={profile}
          location={location}
          locationStatus={locationStatus}
          locationError={locationError}
          onRequestLocation={onRequestNeedLocation}
          requestsDrawerOpen={requestsDrawerOpen}
          onOpenRequestsDrawer={onOpenRequestsDrawer}
          onCloseRequestsDrawer={onCloseRequestsDrawer}
        />
      )}

      <TaskChatModal
        key={showTaskChatModal ? activeTaskChat?.id || 'task-chat' : 'task-chat-closed'}
        open={showTaskChatModal}
        task={activeTaskChat}
        onClose={onCloseTaskChat}
      />
    </HomeLayout>
  )
}
