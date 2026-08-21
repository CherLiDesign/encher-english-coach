import { CoachApp } from "./components/CoachApp";
import { AuthGate } from "./components/AuthGate";

export default function Home() {
  return <AuthGate>{(user, signOut) => <CoachApp user={user} onSignOut={signOut} />}</AuthGate>;
}
