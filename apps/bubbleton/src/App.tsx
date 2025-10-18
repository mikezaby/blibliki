import { useEffect } from "react";
import PlaybackControls from "./components/PlaybackControls";
import Timeline from "./components/Timeline";
import TransportInfo from "./components/TransportInfo";
import { useEngineStore } from "./store/useEngineStore";
import "./style.css";

export default function App() {
  const { init, dispose, isInitialized } = useEngineStore();

  useEffect(() => {
    init();

    return () => {
      dispose();
    };
  }, [init, dispose]);

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <PlaybackControls />

          <TransportInfo />
        </div>
      </header>

      {/* Main */}
      <main className="p-4">
        <Timeline />
      </main>
    </div>
  );
}
