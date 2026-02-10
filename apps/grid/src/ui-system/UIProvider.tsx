import { ChakraProvider } from "@chakra-ui/react";
import { ReactNode } from "react";
import { gridSystem } from "./theme";

export function UIProvider({ children }: { children: ReactNode }) {
  return <ChakraProvider value={gridSystem}>{children}</ChakraProvider>;
}
