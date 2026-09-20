import { Button } from "@blibliki/ui";
import {
  ClerkProvider,
  UserButton,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { LogIn } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { HEADER_PILL_CLASS } from "./headerPill";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Add VITE_CLERK_PUBLISHABLE_KEY to apps/instruments/.env");
}

type GetToken = ReturnType<typeof useAuth>["getToken"];

async function exchangeFirebaseToken(getToken: GetToken) {
  const token = await getToken({ template: "integration_firebase" });
  if (!token) throw new Error("Clerk returned no Firebase token");
  await signInWithCustomToken(getAuth(), token);
}

// Firestore writes are authorized by a Firebase session, so the Clerk session
// is exchanged for a Firebase custom token once the user is known. Same
// exchange as grid's useFirebase hook.
function FirebaseSession() {
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    void exchangeFirebaseToken(getToken);
  }, [getToken, user?.id]);

  return null;
}

// The exchange above runs in the background after sign-in. A write made right
// after signing in can beat it, so that write waits for the session here.
export function useFirebaseSession() {
  const { getToken } = useAuth();

  return async (userId: string) => {
    if (getAuth().currentUser?.uid === userId) return;

    await exchangeFirebaseToken(getToken);
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <FirebaseSession />
      {children}
    </ClerkProvider>
  );
}

export function AccountButton() {
  const { openSignIn, isSignedIn } = useClerk();

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <Button
      variant="text"
      color="neutral"
      onClick={() => {
        openSignIn();
      }}
      className={HEADER_PILL_CLASS}
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </Button>
  );
}
