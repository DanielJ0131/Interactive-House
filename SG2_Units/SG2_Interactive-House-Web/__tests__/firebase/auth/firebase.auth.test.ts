import { getAuth } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";

jest.mock("firebase/app", () => {
  const fakeApp = { name: "mock-app" };

  return {
    initializeApp: jest.fn(() => fakeApp),
    getApps: jest.fn(() => []),
    getApp: jest.fn(() => fakeApp),
  };
});

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ name: "mock-auth" })),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ name: "mock-db" })),
}));

jest.mock("firebase/ai", () => ({
  getAI: jest.fn(() => ({ name: "mock-ai" })),
  getGenerativeModel: jest.fn(() => ({ name: "mock-model" })),
  GoogleAIBackend: jest.fn(),
}));

describe("Firebase auth config", () => {
  test("exports Firebase auth instance", () => {
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(auth).toEqual({ name: "mock-auth" });
  });
});