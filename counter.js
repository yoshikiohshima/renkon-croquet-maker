export function counter({}, realm = {a: "Model", change: "Model"}) {
  const change = Events.or(incr, decr);
  const a = Behaviors.collect(0, change, (prev, change) => prev + change);

  const {html, render} = import("./preact.standalone.module.js");
  const incr = Events.listener(document.body.querySelector("#incr"), "click", (evt) => 1);
  const decr = Events.listener(document.body.querySelector("#decr"), "click", (evt) => -1);
  render(html`<div>${a}</div>`, document.body.querySelector("#count"));

  return {};
}
