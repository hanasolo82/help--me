import './animated-background.css'

export default function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <span className="animated-bg__blob animated-bg__blob--one" />
      <span className="animated-bg__blob animated-bg__blob--two" />
      <span className="animated-bg__blob animated-bg__blob--three" />
      <span className="animated-bg__doodle animated-bg__doodle--one" />
      <span className="animated-bg__doodle animated-bg__doodle--two" />
    </div>
  )
}
