import { ClerkProvider } from "@clerk/clerk-react";
import { ReactFlowProvider } from "@xyflow/react";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
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
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ReactFlowProvider>
          <FirebaseInitializer />
          <EngineInitializer />
          {children}
        </ReactFlowProvider>
      </ClerkProvider>
    </Provider>
  );
}
