import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHashRoute } from "./use-hash-route";

afterEach(() => {
	// Reset hash to empty state after each test
	window.location.hash = "";
});

describe("useHashRoute", () => {
	it("returns '/' when location.hash is empty", () => {
		window.location.hash = "";
		const { result } = renderHook(() => useHashRoute());
		expect(result.current).toBe("/");
	});

	it("returns '/' when location.hash is '#'", () => {
		window.location.hash = "#";
		const { result } = renderHook(() => useHashRoute());
		expect(result.current).toBe("/");
	});

	it("returns '/' when location.hash is '#/'", () => {
		window.location.hash = "#/";
		const { result } = renderHook(() => useHashRoute());
		expect(result.current).toBe("/");
	});

	it("returns '/builder' when location.hash is '#/builder'", () => {
		window.location.hash = "#/builder";
		const { result } = renderHook(() => useHashRoute());
		expect(result.current).toBe("/builder");
	});

	it("updates the route when the hashchange event fires", () => {
		window.location.hash = "";
		const { result } = renderHook(() => useHashRoute());

		expect(result.current).toBe("/");

		act(() => {
			window.location.hash = "#/builder";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		expect(result.current).toBe("/builder");
	});

	it("reverts to hub route when hash changes back to empty", () => {
		window.location.hash = "#/builder";
		const { result } = renderHook(() => useHashRoute());

		expect(result.current).toBe("/builder");

		act(() => {
			window.location.hash = "";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		expect(result.current).toBe("/");
	});

	it("removes the leading # from non-root hashes", () => {
		window.location.hash = "#/some/deep/path";
		const { result } = renderHook(() => useHashRoute());
		expect(result.current).toBe("/some/deep/path");
	});

	it("cleans up the hashchange listener on unmount", () => {
		window.location.hash = "";
		const { result, unmount } = renderHook(() => useHashRoute());

		unmount();

		// After unmount, hash changes should not cause state updates (no errors)
		act(() => {
			window.location.hash = "#/builder";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		// result.current should remain the value at unmount time
		expect(result.current).toBe("/");
	});
});
