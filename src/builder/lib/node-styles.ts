import type { CSSProperties } from "react";

export type ColorEntry = {
	main: string;
	light: string;
	dim: string;
	border: string;
};

export type ColorKey = "indigo" | "amber" | "green" | "blue";

export const COLORS: Record<ColorKey, ColorEntry> = {
	indigo: {
		main: "oklch(0.45 0.18 265)",
		light: "oklch(0.93 0.04 265)",
		dim: "oklch(0.45 0.18 265 / 0.12)",
		border: "oklch(0.45 0.18 265 / 0.2)",
	},
	amber: {
		main: "oklch(0.68 0.14 65)",
		light: "oklch(0.96 0.04 65)",
		dim: "oklch(0.68 0.14 65 / 0.15)",
		border: "oklch(0.68 0.14 65 / 0.25)",
	},
	green: {
		main: "oklch(0.58 0.14 155)",
		light: "oklch(0.94 0.04 155)",
		dim: "oklch(0.58 0.14 155 / 0.12)",
		border: "oklch(0.58 0.14 155 / 0.2)",
	},
	blue: {
		main: "oklch(0.55 0.15 240)",
		light: "oklch(0.94 0.04 240)",
		dim: "oklch(0.55 0.15 240 / 0.12)",
		border: "oklch(0.55 0.15 240 / 0.2)",
	},
};

export const TIER_LABELS: Record<string, string> = {
	client: "Client",
	service: "Service",
	engine: "Engine",
	data: "Data",
};

export const NODE_W = 220;

export function getTierAccentElements(
	tier: string,
	colorMain: string,
	active: boolean,
): CSSProperties[] {
	const opacity = active ? 1 : 0.4;
	const base: CSSProperties = {
		position: "absolute",
		background: colorMain,
		opacity,
	};

	switch (tier) {
		case "service":
			return [
				{
					...base,
					top: 0,
					left: 0,
					bottom: 0,
					width: "3px",
					borderRadius: "12px 0 0 12px",
				},
			];
		case "engine":
			return [
				{
					...base,
					bottom: 0,
					left: 0,
					right: 0,
					height: "2.5px",
					borderRadius: "0 0 12px 12px",
				},
			];
		case "data":
			return [
				{
					...base,
					top: 0,
					left: 0,
					right: 0,
					height: "1.5px",
					borderRadius: "12px 12px 0 0",
				},
				{
					...base,
					bottom: 0,
					left: 0,
					right: 0,
					height: "1.5px",
					borderRadius: "0 0 12px 12px",
				},
			];
		case "client":
		default:
			return [
				{
					...base,
					top: 0,
					left: 0,
					right: 0,
					height: "2.5px",
					borderRadius: "12px 12px 0 0",
				},
			];
	}
}

export function getTierBadgeStyle(tier: string, color: ColorEntry): CSSProperties {
	switch (tier) {
		case "client":
			return {
				background: color.dim,
				color: color.main,
				border: `1px solid ${color.border}`,
			};
		case "service":
			return {
				background: "transparent",
				color: color.main,
				border: `1.5px solid ${color.main}`,
			};
		case "engine":
			return {
				background: color.light,
				color: color.main,
				border: `1px dashed ${color.border}`,
			};
		case "data":
			return {
				background: color.dim,
				color: color.main,
				border: `1.5px double ${color.main}`,
			};
		default:
			return {
				background: color.dim,
				color: color.main,
				border: `1px solid ${color.border}`,
			};
	}
}
