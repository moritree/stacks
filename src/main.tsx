import { render } from "preact";
import "./style.css";
import Scene from "./scene-window";

export default function App() {
  return (
    <div class="w-screen h-screen flex flex-col">
      <Scene />
      <div class="flex-auto bg-red-400" />
    </div>
  );
}

render(<App />, document.getElementById("root")!);
