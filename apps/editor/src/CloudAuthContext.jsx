import { createContext, useContext, useEffect, useState } from "react";
import { isCloudEnabled, signIn, signOut, onAuthChange } from "./publish.js";

const CloudAuthContext = createContext({ isCloudEnabled, user: null, signIn, signOut });

export function CloudAuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // onAuthChange already no-ops safely when cloud isn't configured
  // (calls back with null once, never again) — no extra guard needed here.
  useEffect(() => onAuthChange(setUser), []);

  return (
    <CloudAuthContext.Provider value={{ isCloudEnabled, user, signIn, signOut }}>
      {children}
    </CloudAuthContext.Provider>
  );
}

export function useCloudAuth() {
  return useContext(CloudAuthContext);
}
