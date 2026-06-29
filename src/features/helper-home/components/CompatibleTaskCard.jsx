import TaskCard from '../../tasks/components/TaskCard/TaskCard'

export default function CompatibleTaskCard(props) {
  return (
    <TaskCard
      {...props}
      viewerRole={props.viewerRole || 'helper'}
      primaryActionLabel={props.primaryActionLabel || 'Ver solicitud'}
      secondaryActionLabel={props.secondaryActionLabel}
    />
  )
}
