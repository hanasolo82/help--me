import { cloneElement, forwardRef, isValidElement, useId } from 'react'
import styles from './Field.module.css'

/**
 * Field: envuelve UN control de formulario y cablea label, hint y error con
 * los atributos aria correctos (id, aria-describedby, aria-invalid, required).
 *
 * Uso típico con los controles exportados aquí:
 *
 *   <Field label="Nombre" hint="Visible para tus vecinos" error={errors.name} required>
 *     <Input value={name} onChange={(e) => setName(e.target.value)} />
 *   </Field>
 *
 * También acepta cualquier elemento propio como hijo (recibe los mismos props).
 * El error se anuncia a lectores de pantalla (role="alert").
 */
export function Field({ label, hint, error, required = false, className = '', children }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        required: required || children.props.required,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
      })
    : children

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {control}
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function controlClass(className) {
  return [styles.control, className].filter(Boolean).join(' ')
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={controlClass(className)} {...props} />
})

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={controlClass(className)} {...props} />
})

export const Select = forwardRef(function Select({ className = '', ...props }, ref) {
  return <select ref={ref} className={controlClass(className)} {...props} />
})

export default Field
