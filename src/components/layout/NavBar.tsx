import ThemeToggle from './ThemeToggle';

const allSections = [
  { id: 'workflows', label: 'Workflows' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'projects', label: 'Projects' },
];

interface NavBarProps {
  hideSections?: string[];
}

export default function NavBar({ hideSections = [] }: NavBarProps) {
  const sections = allSections.filter(s => !hideSections.includes(s.id));
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
          href="https://swarpi.github.io"
          style={{
            fontFamily: 'var(--hub-font)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--hub-text)',
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
        <div style={{ width: 1, height: 20, background: 'var(--hub-border)', margin: '0 8px' }} />
        <ThemeToggle />
      </div>
    </nav>
  );
}
