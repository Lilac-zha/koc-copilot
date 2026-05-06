import { useEffect } from "react";
import { usePersonaStore } from "../store/personaStore";
import { getDemo } from "../api";

export function usePersona() {
  const { persona, setPersona, isOnboarded } = usePersonaStore();

  useEffect(() => {
    if (!persona) {
      getDemo()
        .then((res) => setPersona(res.data))
        .catch(console.error);
    }
  }, [persona, setPersona]);

  return { persona, isOnboarded };
}
