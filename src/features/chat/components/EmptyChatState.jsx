export default function EmptyChatState({ title = 'Todavia no hay mensajes', description = 'Escribe el primero y la conversacion aparecera aqui.' }) {
  return (
    <article className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}
