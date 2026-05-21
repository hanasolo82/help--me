import HelperHome from './HelperHome'
import BlockedHelperHome from './BlockedHelperHome'

export default function HelperAccessGate({ profile, helperHomeProps, onStartHelperOnboarding, onNeedHelp }) {
  if (profile?.helper_status === 'active') {
    return <HelperHome {...helperHomeProps} />
  }

  return (
    <BlockedHelperHome
      profile={profile}
      onContinueHelperOnboarding={onStartHelperOnboarding}
      onNeedHelp={onNeedHelp}
    />
  )
}
