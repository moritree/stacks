import { Component } from "preact";
import Scene from "./Scene";
import Inspector from "./Inspector";

export default class App extends Component {
  render() {
    return (
      <div class="app-container">
        <Scene />
        <Inspector />
      </div>
    );
  }
}
