import HomeHeader from '../../components/home/HomeHeader'
import HomeLayout from '../../shared/ui/layouts/HomeLayout'

// Laboratorio dev-only para reproducir el header de /home sin sesión:
// mismo HomeHeader real en modo requester y helper, apilados.
const noop = () => {}

const commonProps = {
  displayName: 'Aroa',
  avatarUrl: '',
  userInitial: 'A',
  onOpenHelper: noop,
  onOpenNeedHelp: noop,
  onOpenChats: noop,
  onOpenFavorites: noop,
  onOpenMyRequests: noop,
  onOpenSettings: noop,
  onOpenNotifications: noop,
  notificationSummary: { unreadMessageCount: 2, interestedHelperCount: 1, pendingConfirmationCount: 0 },
  onOpenPrivacy: noop,
  onOpenHelp: noop,
  onOpenProfile: noop,
  onLogout: noop,
  themePreference: 'light',
  onThemeChange: noop,
  isHelperActive: true,
  zoneSearch: '',
  zoneSearchStatus: 'idle',
  zoneSearchMessage: '',
  onZoneSearchChange: noop,
  onZoneSearchSubmit: noop,
}

export default function HeaderLab() {
  return (
    <HomeLayout
      wide
      header={
        <>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>REQUESTER (isHelperMode=false)</p>
          <HomeHeader {...commonProps} isHelperMode={false} />
          <p className="muted" style={{ margin: '2rem 0 0.5rem' }}>HELPER (isHelperMode=true)</p>
          <HomeHeader {...commonProps} isHelperMode />
        </>
      }
    >
      <div />
    </HomeLayout>
  )
}
