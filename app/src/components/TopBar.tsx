type Props = { isDark: boolean; onToggleTheme: () => void };

export function TopBar({ isDark, onToggleTheme }: Props) {
	const themeLabel = isDark ? "Светлая тема" : "Тёмная тема";
	return (
		<header className="topbar">
			<div className="brand"><div className="brand-mark">MT</div><span className="brand-name">LogicLab</span><span className="brand-caption">Mikhail Technology</span></div>
			<div className="topbar-actions">
				<button className="theme-button" type="button" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>{isDark ? "☀" : "☾"}</button>
			</div>
		</header>
	);
}
