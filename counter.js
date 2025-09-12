export const realm = {model: ["counter", "change", "timer", "thousand"]};

export function counter({}) {
  const change = Events.or(incr, decr, thousand);
  const counter = Behaviors.collect(0, change, (prev, change) => prev + change);
  const timer = Events.timer(1000);
  const thousand = timer ? 1000 : undefined;

  const {html, render} = import("./preact.standalone.module.js");
  const incr = Events.listener(document.body.querySelector("#incr"), "click", (evt) => 1);
  const decr = Events.listener(document.body.querySelector("#decr"), "click", (evt) => -1);
  render(html`<div>${counter}</div>`, document.body.querySelector("#count"));

  return {};
}
