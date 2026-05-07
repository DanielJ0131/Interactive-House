/**
 * @jest-environment jsdom
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("next/link", () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

jest.mock("@/components/TopHeader", () => ({
	__esModule: true,
	default: () => <div data-testid="top-header">Top Header</div>,
}));

jest.mock("@/components/pageShell", () => ({
	PageShell: ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
		<section>
			<h1>{title}</h1>
			{subtitle ? <p>{subtitle}</p> : null}
			{children}
		</section>
	),
}));

jest.mock("@phosphor-icons/react", () => ({
	MusicNotes: () => <span data-testid="icon-music" />,
	CaretLeft: () => <span data-testid="icon-left" />,
	Play: () => <span data-testid="icon-play" />,
	Stop: () => <span data-testid="icon-stop" />,
}));

jest.mock("@/utils/firebaseConfig", () => ({
	db: { __mockDb: true },
}));

jest.mock("firebase/firestore", () => ({
	collection: jest.fn(),
	getDocs: jest.fn(),
}));

const loadMusicPage = async () => {
	const module = await import("@/app/music/page");
	return module.default;
};

const { collection, getDocs } = jest.requireMock("firebase/firestore") as {
	collection: jest.Mock;
	getDocs: jest.Mock;
};

const mockCollection = collection as unknown as jest.Mock;
const mockGetDocs = getDocs as unknown as jest.Mock;

const oscillatorStartMock = jest.fn();
const oscillatorStopMock = jest.fn();
const oscillatorConnectMock = jest.fn();
const oscillatorSetFrequencyMock = jest.fn();
const gainConnectMock = jest.fn();
const gainSetMock = jest.fn();
const gainRampMock = jest.fn();
const audioCloseMock = jest.fn();

class MockAudioContext {
	currentTime = 0;
	destination = {};

	createOscillator() {
		return {
			type: "",
			frequency: {
				setValueAtTime: oscillatorSetFrequencyMock,
			},
			connect: oscillatorConnectMock,
			start: oscillatorStartMock,
			stop: oscillatorStopMock,
		};
	}

	createGain() {
		return {
			gain: {
				setValueAtTime: gainSetMock,
				exponentialRampToValueAtTime: gainRampMock,
			},
			connect: gainConnectMock,
		};
	}

	close = audioCloseMock;
}

const makeQuerySnapshot = (overrides?: { frequencies?: number[]; noteDelays?: number[] }) => ({
	docs: [
		{
			id: "song-1",
			data: () => ({
				name: "Lullaby",
				artist: "SG2",
				frequencies: overrides?.frequencies ?? [440],
				noteDelays: overrides?.noteDelays ?? [120],
			}),
		},
	],
});

describe("Music screen", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		mockCollection.mockReturnValue({ __mockCollectionRef: true });
		mockGetDocs.mockResolvedValue(makeQuerySnapshot());

		Object.defineProperty(window, "AudioContext", {
			writable: true,
			configurable: true,
			value: MockAudioContext,
		});

		Object.defineProperty(window, "webkitAudioContext", {
			writable: true,
			configurable: true,
			value: MockAudioContext,
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("loads songs from Firestore and renders key music controls", async () => {
		const MusicPage = await loadMusicPage();
		render(<MusicPage />);

		await waitFor(() => expect(screen.getByText("Lullaby")).toBeInTheDocument());

		expect(mockGetDocs).toHaveBeenCalledTimes(1);
		expect(mockCollection).toHaveBeenCalledWith(expect.any(Object), "music");
		expect(screen.getByText("SG2")).toBeInTheDocument();
		expect(screen.getByText("Current Melody")).toBeInTheDocument();
		expect(screen.getByText("Available Tracks")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "SLOW" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "NORMAL" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "FAST" })).toBeInTheDocument();
		expect(screen.getByText("OFF")).toBeInTheDocument();
	});

	it("switches to ON while a track plays and returns to OFF after playback completes", async () => {
		jest.useFakeTimers();

		const MusicPage = await loadMusicPage();
		render(<MusicPage />);

		await waitFor(() => expect(screen.getByText("Lullaby")).toBeInTheDocument());

		fireEvent.click(screen.getByRole("button", { name: /play/i }));

		expect(screen.getByText("ON")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();

		await act(async () => {
			jest.advanceTimersByTime(140);
			await Promise.resolve();
		});

		await waitFor(() => expect(screen.getByText("OFF")).toBeInTheDocument());
		expect(oscillatorSetFrequencyMock).toHaveBeenCalledWith(440, 0);
		expect(oscillatorStartMock).toHaveBeenCalledTimes(1);
		expect(oscillatorStopMock).toHaveBeenCalledTimes(1);
	});

	it("stops playback immediately when STOP is pressed", async () => {
		jest.useFakeTimers();

		mockGetDocs.mockResolvedValue(
			makeQuerySnapshot({
				frequencies: [440, 494],
				noteDelays: [900, 900],
			})
		);

		const MusicPage = await loadMusicPage();
		render(<MusicPage />);

		await waitFor(() => expect(screen.getByText("Lullaby")).toBeInTheDocument());

		fireEvent.click(screen.getByRole("button", { name: /play/i }));
		expect(screen.getByText("ON")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /stop/i }));

		await waitFor(() => expect(screen.getByText("OFF")).toBeInTheDocument());
		expect(audioCloseMock).toHaveBeenCalledTimes(1);
	});
});
