import { getFirestore } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";

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

describe("Firebase Firestore config", () => {
  test("exports Firebase Firestore database instance", () => {
    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(db).toEqual({ name: "mock-db" });
  });
});