import { useBuilderStore } from "../store/builder-store";

export function useTooltipPin(pinId: string | undefined) {
	const pinnedTooltipId = useBuilderStore((s) => s.pinnedTooltipId);
	const pinTooltip = useBuilderStore((s) => s.pinTooltip);
	const unpinTooltip = useBuilderStore((s) => s.unpinTooltip);

	const isPinned = pinId != null && pinnedTooltipId === pinId;

	const togglePin = () => {
		if (!pinId) return;
		if (isPinned) unpinTooltip();
		else pinTooltip(pinId);
	};

	return { isPinned, togglePin, unpin: unpinTooltip };
}
