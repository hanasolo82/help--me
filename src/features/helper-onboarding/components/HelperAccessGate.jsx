import HelperHome from '../../helper-home/components/HelperHome'
import BlockedHelperHome from './BlockedHelperHome'

export default function HelperAccessGate({ profile, helperHomeProps, onStartHelperOnboarding, onNeedHelp }) {
  if (profile?.helper_status === 'active') {
    return <HelperHome profile={profile} helperHomeProps={helperHomeProps} />
  }

  return (
    <BlockedHelperHome
      profile={profile}
      onContinueHelperOnboarding={onStartHelperOnboarding}
      onNeedHelp={onNeedHelp}
    />
  )
}
