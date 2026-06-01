import TaskCard from '../../tasks/components/TaskCard/TaskCard'

export default function CompatibleTaskCard(props) {
  return (
    <TaskCard
      {...props}
      primaryActionLabel={props.primaryActionLabel || 'Ver solicitud'}
      secondaryActionLabel={props.secondaryActionLabel}
    />
  )
}
