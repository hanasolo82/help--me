export default function TypingIndicator({ typingUsers = [] }) {
  if (!typingUsers.length) {
    return null
  }

  return (
    <p className="muted" aria-live="polite">
      {typingUsers.length === 1 ? 'Un usuario esta escribiendo...' : `${typingUsers.length} usuarios estan escribiendo...`}
    </p>
  )
}
