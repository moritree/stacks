import { Component } from "preact";
import Scene from "./Scene";
import Inspector from "./Inspector";

export default class App extends Component {
  render() {
    return (
      <div class="flex flex-col z-10 h-screen w-screen">
        <div class="flex w-full h-[720px]">
          <Scene />
          <Inspector />
        </div>
        <div class="bg-(--secondary-color) border-t border-(--border-color) flex-1 h-full" />
      </div>
    );
  }
}
