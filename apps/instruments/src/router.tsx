import { createRouter } from "@tanstack/react-router";
import { initializeFirebaseOnce } from "./firebase";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // Instruments are read from Firestore, so this has to happen before any
  // route loads. It cannot live in the root route's beforeLoad: the shell is
  // prerendered, so on the client the root match is restored from the
  // dehydrated state and that hook never runs in the browser.
  if (typeof window !== "undefined") {
    initializeFirebaseOnce();
  }

  return createRouter({
    routeTree,
    scrollRestoration: true,
  });
}
