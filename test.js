import {croquetify} from "./croquet.js";
import {counter} from "./counter.js";

const {model, view} = croquetify(counter, "MyApp");

Croquet.Session.join({
  apiKey: "234567_Paste_Your_Own_API_Key_Here_7654321",
  appId: 'org.tinlizzie.myapp',
  model: model,
  view: view,
  box: "http://localhost:8888",
  tps: 0,
});

