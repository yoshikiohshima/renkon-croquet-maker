import {ProgramState} from "./renkon-core.js";

//
// oncePerFrame that accumlates the changes for this cycle.
// returnValues for func for now would say what are the values that are interests of view
// can we figure out the events that the model part needs by looking at


function decls(funcStr, realm) {
  const state = new ProgramState(0);
  const {params, types, returnValues, output} = state.getFunctionBody(funcStr);

  const decls = state.findDecls(output);

  const check = (d) => d.decls.length === 1 && realm[d.decls[0]] === "Model";

  const modelDecls = decls.filter((decl) => check(decl));
  const viewDecls = decls.filter((decl) => !check(decl));

  return {modelDecls, viewDecls, params, types, returnValues};
}

function strs(decls) {
  const {modelDecls, viewDecls} = decls;

  const viewEvents = [];
  for (const viewDecl of viewDecls) {
    if (Array.isArray(viewDecl.decls)) {
      for (const d of viewDecl.decls) {
        viewEvents.push(`const ${d} = Events.receiver({queued: true});`);
      }
    }
  }

  const modelEvents = [];
  for (const modelDecl of modelDecls) {
    if (Array.isArray(modelDecl.decls)) {
      for (const d of modelDecl.decls) {
        modelEvents.push(`const ${d} = Events.receiver();`);
      }
    }
  }

  const replace = (str) => {
    return str.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("$", "\\$");
  };

  const modelNodeStr = replace(modelDecls.map(m => m.code).join("\n"));
  const viewEventsStr = replace(viewEvents.join("\n"));

  const viewNodeStr = replace(viewDecls.map(m => m.code).join("\n"));
  const modelEventsStr = replace(modelEvents.join("\n"));

  return {modelNodeStr, viewEventsStr, viewNodeStr, modelEventsStr};
}


export function croquetify(func, appName, realm) {
  const funcStr = typeof func === "function" ? func.toString() : func;
  const modelName = appName + "Model";
  const viewName = appName + "View";

  const modelStr = `
class ${modelName} extends Croquet.Model {
  init(_options, persistent) {
    super.init(_options, persistent);

    this.funcStr = funcStr;
    const nodes = decls(funcStr, realm);
    const {modelNodeStr, viewEventsStr, viewNodeStr, modelEventsStr} = strs(nodes);

    this.programState = new ProgramState(0);
    this.programState.setupProgram([modelNodeStr, viewEventsStr]);
    this.programState.options = {once: true};
    this.programState.evaluate(this.now());

    this.subscribe(this.id, "viewMessage", this.viewMessage);
  }

  viewMessage(data) {
console.log("receive", data)
    const {name, value} = data;
    if (name === undefined || value === undefined) {return;}
    this.programState.registerEvent(name, value);
    this.programState.evaluate(this.now());
    this.publish(this.id, "modelUpdate", ["a"]);
  }

  static types() {
    return {
      ProgramState: {
        cls: ProgramState,
        write: (ps) => {
          return {
            scripts: ps.scripts,
            resolved: ps.resolved,
            scratch: ps.scratch,
            time: ps.time
          };
        },
        read: (obj) => {
          let t = new ProgramState(0);
          t.setupProgram(obj.scripts);
          t.options = {once: true};
          t.evaluate(obj.time);
          t.resolved = obj.resolved;
          t.scratch = obj.scratch;
          return t;
        }
     },
   }
  }
}
`.trim();

  const viewStr = `
class ${viewName} extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    const nodes = decls(model.funcStr, realm);
    const {modelNodeStr, viewEventsStr, viewNodeStr, modelEventsStr} = strs(nodes);
    this.programState = new ProgramState(0, this);
    this.programState.setupProgram([viewNodeStr, modelEventsStr]);
    this.programState.evaluate(this.now());
    this.subscribe(this.model.id, "modelUpdate", this.modelUpdate);
  }

  modelUpdate(keys) {
    console.log("view receive", keys);
    for (const key of keys) {
      const value = this.model.programState.resolved.get(key);
      if (value && value.value !== undefined) {
        this.programState.registerEvent(key, value.value);
      }
    }
  }
}`.trim();

  const result = new Function(
    "funcStr", "realm", "ProgramState", "Croquet", "decls", "strs",
    `return {model: ${modelStr}, view: ${viewStr}}`
  )(funcStr, realm, ProgramState, Croquet, decls, strs);

  result.model.register(modelName);
  return result;
}

/* globals Croquet */
