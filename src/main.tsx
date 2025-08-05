import { render } from "preact";
import "./style.css";
import Scene from "./scene-window";
import Inspector from "./inspector/inspector";

export default function App() {
  return (
    <div class="w-screen h-screen flex flex-row">
      <div class="w-full h-full flex flex-col">
        <Scene />
        <div class="flex-auto bg-red-400" />
      </div>
      <div class="flex-none w-96">
        <Inspector />
      </div>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
