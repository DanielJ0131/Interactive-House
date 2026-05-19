"use client";

import { useEffect, useState } from "react";
import { isGuestSession } from "@/utils/guestSession";

export const useGuestMode = () => {
  // Start as null so the app knows we are still checking the browser cookies
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    // Once the client mounts, check the cookie and update to true or false
    setIsGuest(isGuestSession());
  }, []);

  return isGuest;
};