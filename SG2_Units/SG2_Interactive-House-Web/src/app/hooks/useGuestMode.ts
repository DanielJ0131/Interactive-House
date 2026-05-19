"use client";

import { useEffect, useState } from "react";
import { isGuestSession } from "@/utils/guestSession";

const getGuestState = () => {
  if (typeof document === "undefined") return false;
  return isGuestSession();
};

export const useGuestMode = () => {
  const [isGuest, setIsGuest] = useState(getGuestState);

  useEffect(() => {
    setIsGuest(getGuestState());
  }, []);

  return isGuest;
};
