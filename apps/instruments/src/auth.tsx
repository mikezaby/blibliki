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

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Add VITE_CLERK_PUBLISHABLE_KEY to apps/instruments/.env");
}

// Firestore writes are authorized by a Firebase session, so the Clerk session
// is exchanged for a Firebase custom token once the user is known. Same
// exchange as grid's useFirebase hook.
function FirebaseSession() {
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    void (async () => {
      const token = await getToken({ template: "integration_firebase" });
      if (!token) throw new Error("Clerk returned no Firebase token");
      await signInWithCustomToken(getAuth(), token);
    })();
  }, [getToken, user?.id]);

  return null;
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
      className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </Button>
  );
}
