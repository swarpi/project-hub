interface TierIconProps {
	size?: number;
	color?: string;
}

function ClientIcon({ size = 16, color = "currentColor" }: TierIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="1.5"
				y="2"
				width="13"
				height="9"
				rx="1.5"
				stroke={color}
				strokeWidth="1.3"
			/>
			<line
				x1="1.5"
				y1="8"
				x2="14.5"
				y2="8"
				stroke={color}
				strokeWidth="1"
				opacity="0.4"
			/>
			<line
				x1="8"
				y1="11"
				x2="8"
				y2="13"
				stroke={color}
				strokeWidth="1.3"
			/>
			<line
				x1="5.5"
				y1="13"
				x2="10.5"
				y2="13"
				stroke={color}
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function ServiceIcon({ size = 16, color = "currentColor" }: TierIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="3"
				y="1.5"
				width="10"
				height="4"
				rx="1"
				stroke={color}
				strokeWidth="1.3"
			/>
			<circle cx="5.5" cy="3.5" r="0.8" fill={color} />
			<rect
				x="3"
				y="6.5"
				width="10"
				height="4"
				rx="1"
				stroke={color}
				strokeWidth="1.3"
			/>
			<circle cx="5.5" cy="8.5" r="0.8" fill={color} />
			<line
				x1="8"
				y1="10.5"
				x2="8"
				y2="12.5"
				stroke={color}
				strokeWidth="1.3"
			/>
			<line
				x1="5.5"
				y1="12.5"
				x2="10.5"
				y2="12.5"
				stroke={color}
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function EngineIcon({ size = 16, color = "currentColor" }: TierIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.3" />
			<circle cx="8" cy="8" r="1" fill={color} />
			{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
				const rad = (angle * Math.PI) / 180;
				const x1 = 8 + Math.cos(rad) * 4.2;
				const y1 = 8 + Math.sin(rad) * 4.2;
				const x2 = 8 + Math.cos(rad) * 5.8;
				const y2 = 8 + Math.sin(rad) * 5.8;
				return (
					<line
						key={angle}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke={color}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				);
			})}
		</svg>
	);
}

function DataIcon({ size = 16, color = "currentColor" }: TierIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<ellipse
				cx="8"
				cy="4"
				rx="5"
				ry="2.2"
				stroke={color}
				strokeWidth="1.3"
			/>
			<path
				d="M3 4v8c0 1.2 2.24 2.2 5 2.2s5-1 5-2.2V4"
				stroke={color}
				strokeWidth="1.3"
			/>
			<path
				d="M3 8c0 1.2 2.24 2.2 5 2.2s5-1 5-2.2"
				stroke={color}
				strokeWidth="1"
				opacity="0.4"
			/>
		</svg>
	);
}

const TIER_ICONS: Record<
	string,
	React.ComponentType<TierIconProps>
> = {
	client: ClientIcon,
	service: ServiceIcon,
	engine: EngineIcon,
	data: DataIcon,
};

export function TierIcon({
	tier,
	size = 16,
	color = "currentColor",
}: TierIconProps & { tier: string }): React.ReactElement | null {
	const Icon = TIER_ICONS[tier];
	if (!Icon) return null;
	return <Icon size={size} color={color} />;
}
