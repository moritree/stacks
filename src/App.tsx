import { useEffect, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export default function App() {
  const [entities, setEntities] = useState({});

  useEffect(() => {
    invoke("init_scene");
    listen("scene_update", (e) => setEntities(e.payload as string));
  }, []);

  return (
    <div class="w-full h-screen bg-gray-900">
      {/* render ur entities here king */}
    </div>
  );
}
