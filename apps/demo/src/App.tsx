import { useEffect } from "react";
import ModuleList from "./components/ModuleList";
import { ExampleKey, exampleList, useExample } from "./examples";
import { useEngineStore } from "./store/useEngineStore";

function getExampleFromPath(): ExampleKey | undefined {
  const match = /^\/examples\/([a-zA-Z0-9_-]+)$/.exec(window.location.pathname);
  const key = match?.[1];

  if (key && exampleList.some((e) => e.key === key)) {
    return key as ExampleKey;
  }

  return undefined;
}

export default function App() {
  const { init, start, stop, isStarted, dispose } = useEngineStore();
  const { currentExample, setExample } = useExample();

  useEffect(() => {
    const exampleFromPath = getExampleFromPath();

    void init().then(() => {
      if (
        exampleFromPath &&
        exampleList.some((e) => e.key === exampleFromPath)
      ) {
        void setExample(exampleFromPath);
      }
    });
  }, [init, setExample]);

  const handleClick = (example: ExampleKey) => {
    if (example === currentExample) return;

    dispose();
    window.history.pushState({}, "", `/examples/${example}`);
    void setExample(example);
  };

  const btnClassName = isStarted
    ? "bg-red-500 hover:bg-red-600"
    : "bg-green-500 hover:bg-green-600";

  return (
    <div className="h-screen flex flex-col font-sans text-sm text-gray-900 bg-gray-50">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white shadow-sm">
        <div className="text-lg font-semibold w-400">Blibliki examples</div>
        <div className="w-full">
          <button
            onClick={isStarted ? stop : start}
            className={`px-3 py-1 rounded text-white transition ${btnClassName}`}
          >
            {isStarted ? "Stop" : "Start"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white p-4 border-r border-gray-200 shadow-sm">
          <ul className="space-y-2">
            {exampleList.map(({ key, label }) => (
              <li key={key}>
                <button
                  onClick={() => {
                    handleClick(key);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 p-6 overflow-auto bg-white">
          <ModuleList />
        </main>
      </div>
    </div>
  );
}
