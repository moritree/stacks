import { useEffect, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import entityComponent from "./entityComponent";

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
    let unlisten: () => void;
    const setup = async () => {
      unlisten = await listen<any>("scene_update", (e) => {
        setEntities(e.payload);
      });
    };

    setup();

    // clean up listener on unmount
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return <div>{Object.entries(entities).map(entityComponent)}</div>;
}
