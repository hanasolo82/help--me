export default function CategoryFilter({ category, onChange, options }) {
  return (
    <label>
      <span>Actividad</span>
      <select value={category} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  )
}

