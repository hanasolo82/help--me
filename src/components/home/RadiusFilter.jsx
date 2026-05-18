export default function RadiusFilter({ radius, onChange, options }) {
  return (
    <label>
      <span>Radio maximo</span>
      <select value={radius} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((item) => (
          <option key={item} value={item}>
            {item} km
          </option>
        ))}
      </select>
    </label>
  )
}

