import { useEffect, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toComponent } from "./types";

export default function App() {
  const [entities, setEntities] = useState<any>({});

  useEffect(() => {
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      invoke("tick", { dt });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // setup listener and immediately start handling updates
    const setup = async () => {
      const unlisten = await listen<any>("scene_update", (e) => {
        console.log("got update:", e.payload);
        setEntities(e.payload);
      });
      return unlisten;
    };

    setup();

    return () => {
      setup().then((u) => u());
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white relative">
      {Object.entries(entities).map(toComponent)}
    </div>
  );
}
