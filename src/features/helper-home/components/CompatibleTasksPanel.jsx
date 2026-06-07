import TaskListPanel from '../../home/offer-help/components/TaskListPanel'

export default function CompatibleTasksPanel(props) {
  return (
    <TaskListPanel
      {...props}
      emptyTitle="No hay solicitudes compatibles ahora."
      emptyDescription="Mueve el mapa, añade disponibilidad o revisa tus habilidades."
      emptyActionLabel={null}
      emptyTone="warning"
    />
  )
}
