import TaskListPanel from '../../home/offer-help/components/TaskListPanel'

export default function CompatibleTasksPanel(props) {
  return (
    <TaskListPanel
      {...props}
      emptyTitle="No hay solicitudes compatibles ahora."
      emptyDescription="Prueba a ampliar tu radio, añadir disponibilidad o revisar tus habilidades."
      emptyActionLabel={props.onExpandRadius ? 'Ampliar radio' : null}
      emptyTone="warning"
    />
  )
}
