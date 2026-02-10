import { ChakraProvider } from "@chakra-ui/react";
import { ReactNode } from "react";
import { ColorSchemeProvider } from "@/hooks/useColorScheme";
import { gridSystem } from "./theme";

export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={gridSystem}>
      <ColorSchemeProvider>{children}</ColorSchemeProvider>
    </ChakraProvider>
  );
}
