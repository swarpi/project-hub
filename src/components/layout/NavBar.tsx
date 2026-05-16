import ThemeToggle from './ThemeToggle';

const allSections = [
  { id: 'workflows', label: 'Workflows' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'projects', label: 'Projects' },
];

const routes = [
  { hash: '#/', label: 'Hub' },
  { hash: '#/builder', label: 'Builder' },
];

interface NavBarProps {
  activeRoute: string;
  hideSections?: string[];
}

export default function NavBar({ activeRoute, hideSections = [] }: NavBarProps) {
  const sections = allSections.filter(s => !hideSections.includes(s.id));
  const isHub = activeRoute === '/';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--hub-bg)',
        borderBottom: '1px solid var(--hub-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <a
          href="#/"
          style={{
            fontFamily: 'var(--hub-font)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--hub-text)',
            textDecoration: 'none',
          }}
        >
          swarpi
        </a>
        <span
          style={{
            fontFamily: 'var(--hub-mono)',
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--hub-accent)',
            background: 'var(--hub-accent-light)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid var(--hub-border)',
          }}
        >
          hub
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {routes.map((r) => {
          const isActive = (r.hash === '#/' && isHub) || (r.hash !== '#/' && activeRoute === r.hash.replace('#', ''));
          return (
            <a
              key={r.hash}
              href={r.hash}
              style={{
                fontFamily: 'var(--hub-font)',
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? 'var(--hub-accent)' : 'var(--hub-text-dim)',
                background: isActive ? 'var(--hub-accent-light)' : 'none',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 100,
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
            >
              {r.label}
            </a>
          );
        })}

        {isHub && sections.length > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--hub-border)', margin: '0 8px' }} />
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  fontFamily: 'var(--hub-font)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--hub-text-dim)',
                  background: 'none',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 100,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hub-accent-light)';
                  e.currentTarget.style.color = 'var(--hub-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--hub-text-dim)';
                }}
              >
                {s.label}
              </button>
            ))}
          </>
        )}

        <div style={{ width: 1, height: 20, background: 'var(--hub-border)', margin: '0 8px' }} />
        <ThemeToggle />
      </div>
    </nav>
  );
}
