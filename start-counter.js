import {croquetify} from "./croquet.js";
import {counter, realm} from "./counter.js";

debugger;
const {model, view} = croquetify(counter, "Counter", new Map(realm.model.map((key) => [key, "Model"])));

Croquet.Session.join({
  apiKey: "234567_Paste_Your_Own_API_Key_Here_7654321",
  appId: 'org.tinlizzie.counter',
  model: model,
  view: view,
  box: "http://localhost:8888",
  tps: 2,
});

