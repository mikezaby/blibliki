import { useEffect } from "react";
import { initialize, dispose } from "@/globalSlice";
import { useAppDispatch } from "@/hooks";

export default function EngineInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initialize());

    return () => {
      void dispatch(dispose());
    };
  }, [dispatch]);

  return null;
}
