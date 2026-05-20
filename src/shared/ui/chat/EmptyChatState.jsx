import styles from './EmptyChatState.module.css'

export default function EmptyChatState({ title = 'Todavia no hay mensajes', description = 'Escribe el primero y la conversacion aparecera aqui.' }) {
  return (
    <article className={styles.card}>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}
