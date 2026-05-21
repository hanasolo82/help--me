import HelperAccessGate from '../../../features/helper-onboarding/components/HelperAccessGate'

export default function HelperHomeMode({ profile, helperHomeProps, onStartHelperOnboarding, onNeedHelp }) {
  return (
    <HelperAccessGate
      profile={profile}
      helperHomeProps={helperHomeProps}
      onStartHelperOnboarding={onStartHelperOnboarding}
      onNeedHelp={onNeedHelp}
    />
  )
}
