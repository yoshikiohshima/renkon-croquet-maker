import {croquetify} from "./croquet.js";
import {pad, realm} from "./pad-rotation.js";

import {ProgramState, CodeMirror, newInspector} from "./renkon-web.js";
window.CodeMirror = CodeMirror;
window.newInspector = newInspector;

const {model, view} = croquetify(pad, "Pad", new Map(realm.model.map((key) => [key, "Model"])));

Croquet.Session.join({
  apiKey: "234567_Paste_Your_Own_API_Key_Here_7654321",
  appId: 'org.tinlizzie.pad',
  model: model,
  view: view,
  box: "http://localhost:8888",
  eventRateLimit: 60,
  tps: 20,
});

