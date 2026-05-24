import { useEffect } from "react";

export function useOutsideClick(
	refs: React.RefObject<HTMLElement | SVGElement | null>[],
	active: boolean,
	onOutsideClick: () => void,
) {
	useEffect(() => {
		if (!active) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as Node;
			if (refs.some((ref) => ref.current?.contains(target))) return;
			onOutsideClick();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [refs, active, onOutsideClick]);
}
