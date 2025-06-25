"use client";

import { ClerkProvider } from "@clerk/tanstack-react-start";
import { ReactFlowProvider } from "@xyflow/react";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import EngineInitializer from "./EngineInitializer";
import FirebaseInitializer from "./FirebaseInitializer";

export default function Providers(props: { children: ReactNode }) {
  const { children } = props;

  return (
    <Provider store={store}>
      <ClerkProvider afterSignOutUrl="/">
        <ReactFlowProvider>
          <FirebaseInitializer />
          <EngineInitializer />
          {children}
        </ReactFlowProvider>
      </ClerkProvider>
    </Provider>
  );
}
