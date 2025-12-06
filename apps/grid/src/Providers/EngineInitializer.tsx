import { useEffect } from "react";
import { initialize, dispose } from "@/globalSlice";
import { useAppDispatch } from "@/hooks";

export default function EngineInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(initialize());

    return () => {
      dispatch(dispose());
    };
  }, [dispatch]);

  return null;
}
