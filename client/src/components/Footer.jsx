import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <span>&copy; {year} Cherry&apos;s Labs</span>
      <span className="footer-sep">·</span>
      <a href="http://cherryslabs.elphiene.com" target="_blank" rel="noopener noreferrer">cherryslabs.com</a>
      <span className="footer-sep">·</span>
      <a href="mailto:el@cherryslabs.com">el@cherryslabs.com</a>
    </footer>
  )
}
