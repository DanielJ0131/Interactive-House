import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		addListener: jest.fn(),
		removeListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

if (!globalThis.Headers) {
	globalThis.Headers = class Headers {
		private map = new Map<string, string>();

		append(key: string, value: string) {
			this.map.set(key.toLowerCase(), value);
		}

		get(key: string) {
			return this.map.get(key.toLowerCase()) ?? null;
		}
	} as typeof Headers;
}

if (!globalThis.Response) {
	globalThis.Response = class Response {
		ok = true;
		status = 200;
		statusText = "OK";
		headers = new globalThis.Headers();
		private bodyText: string;

		constructor(body?: string) {
			this.bodyText = body ?? "";
		}

		async json() {
			return this.bodyText ? JSON.parse(this.bodyText) : {};
		}

		async text() {
			return this.bodyText;
		}
	} as typeof Response;
}

if (!globalThis.Request) {
	globalThis.Request = class Request {
		constructor(public input: string) {}
	} as typeof Request;
}

if (!globalThis.fetch) {
	globalThis.fetch = jest.fn(() => Promise.resolve(new globalThis.Response()));
}
