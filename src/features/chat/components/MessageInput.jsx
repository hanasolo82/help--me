import { useEffect, useRef } from 'react'

export default function MessageInput({
  value,
  onChange,
  onSubmit,
  sending = false,
  placeholder = 'Escribe un mensaje',
  maxLength = 2000,
  disabled = false,
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
  }, [value])

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={sending || disabled}
        rows={1}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSubmit?.()
          }
        }}
      />
      <button type="submit" className="primary-action" disabled={sending || disabled || !value.trim()}>
        {sending ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
