import { Theme } from "@chakra-ui/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ReactFlowProvider } from "@xyflow/react";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { useColorScheme } from "@/hooks/useColorScheme";
import { store } from "@/store";
import { UIProvider } from "@/ui-system/UIProvider";
import EngineInitializer from "./EngineInitializer";
import FirebaseInitializer from "./FirebaseInitializer";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env.local file");
}

export default function Providers(props: { children: ReactNode }) {
  const { children } = props;

  return (
    <Provider store={store}>
      <UIProvider>
        <ColorSchemeTheme>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <ReactFlowProvider>
              <FirebaseInitializer />
              <EngineInitializer />
              {children}
            </ReactFlowProvider>
          </ClerkProvider>
        </ColorSchemeTheme>
      </UIProvider>
    </Provider>
  );
}

function ColorSchemeTheme({ children }: { children: ReactNode }) {
  const { resolvedColorScheme } = useColorScheme();

  return (
    <Theme appearance={resolvedColorScheme} hasBackground={false}>
      {children}
    </Theme>
  );
}
