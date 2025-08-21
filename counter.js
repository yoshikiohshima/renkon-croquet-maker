export function counter({}, realm = {a: "Model"}) {
  const {h, html, render} = import("./preact.standalone.module.js");
  const a = Behaviors.collect(0, incr, (prev, _incr) => prev + 1);

  const incr = Events.listener(document.body.querySelector("#incr"), "click", (evt) => 1);

  console.log(incr);

  ((incr) => {
    console.log(Renkon.app.model.id, "viewMessage", {name: "incr", value: incr});
    Renkon.app.publish(Renkon.app.model.id, "viewMessage", {name: "incr", value: incr});
  })(incr);

  const dom = h("div", {}, a);
  render(dom, document.body.querySelector("#count"));

  return {};
}

