import {ProgramState} from "./renkon-core.js";

//
// oncePerFrame that accumlates the changes for this cycle.
// returnValues for func for now would say what are the values that are interests of view
// can we figure out the events that the model part needs by looking at


function decls(funcStr, realm) {
  const state = new ProgramState(0);

  const {output} = state.getFunctionBody(funcStr);
  state.setupProgram([output]);

  const decls = state.findDecls(output);
  const check = (d) => d.decls.length > 0 && realm[d.decls[0]] === "Model";

  const modelDecls = decls.filter((decl) => check(decl));
  const viewDecls = decls.filter((decl) => !check(decl));

  const modelState = new ProgramState(0);
  modelState.setLog(() => {});
  modelState.setupProgram([modelDecls.map(m => m.code).join("\n")]);
  const viewState = new ProgramState(0);
  viewState.setLog(() => {});
  viewState.setupProgram([viewDecls.map(m => m.code).join("\n")]);

  const modelVarsArray = [];
  const modelUsesArray = [];
  for (const [id, modelNode] of modelState.nodes) {
    if (!/^_?[0-9]/.exec(id)) {
      modelVarsArray.push(id);
    }
    for (const input of modelNode.inputs) {
      if (!/^_?[0-9]/.exec(input)) {
        modelUsesArray.push(input);
      }
    }
  }

  const viewVarsArray = [];
  const viewUsesArray = [];
  for (const [id, viewNode] of viewState.nodes) {
    if (!/^_?[0-9]/.exec(id)) {
      viewVarsArray.push(id);
    }
    for (const input of viewNode.inputs) {
      if (!/^_?[0-9]/.exec(input)) {
        viewUsesArray.push(input);
      }
    }
  }

  const viewToModel = new Set(viewVarsArray).intersection(new Set(modelUsesArray));
  const modelToView = new Set(modelVarsArray).intersection(new Set(viewUsesArray));

  return {modelDecls, viewDecls, viewToModel, modelToView};
}

function strs(decls) {
  const {modelDecls, viewDecls} = decls;

  const viewEvents = [];
  for (const viewDecl of viewDecls) {
    if (Array.isArray(viewDecl.decls)) {
      for (const d of viewDecl.decls) {
        viewEvents.push(`const ${d} = Events.receiver();`);
      }
    }
  }

  const modelEvents = [];
  for (const modelDecl of modelDecls) {
    if (Array.isArray(modelDecl.decls)) {
      for (const d of modelDecl.decls) {
        modelEvents.push(`const ${d} = Behaviors.receiver();`);
      }
    }
  }

  const modelNodeStr = modelDecls.map(m => m.code).join("\n");
  const viewEventsStr = viewEvents.join("\n");

  const viewNodeStr = viewDecls.map(m => m.code).join("\n");
  const modelEventsStr = modelEvents.join("\n");

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

    this.$lastPublishTime = this.now();

    this.funcStr = funcStr;
    const nodes = decls(funcStr, realm);
    this.viewToModel = nodes.viewToModel;
    this.modelToView = nodes.modelToView;
    const {modelNodeStr, viewEventsStr, viewNodeStr, modelEventsStr} = strs(nodes);

    this.programState = new ProgramState(0);
    this.programState.setupProgram([modelNodeStr, viewEventsStr]);
    this.programState.options = {once: true};
    this.programState.evaluate(this.now());

    this.subscribe(this.id, "viewMessage", this.viewMessage);
  }

  viewMessage(data) {
    const now = this.now();
    if (this.$lastPublishTime !== now) {
      this.$changedKeys = new Set();
      this.$lastPublishTime = now;
    }

    const {name, value} = data;

    if (name === undefined || value === undefined) {return;}
    this.programState.registerEvent(name, value);
    let changedKeys = this.programState.evaluate(now);
    changedKeys = changedKeys.union(this.modelToView);
    this.$changedKeys = this.$changedKeys.union(changedKeys);
    this.publish(this.id, "modelUpdate", this.$changedKeys);
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
    this.programState.announcer = (varName, value) => this.announcer(varName, value);
    this.programState.evaluate(this.now());

    this.initViewState();
    this.subscribe(this.model.id, {event: "modelUpdate", handling: "oncePerFrame"}, this.modelUpdate);
  }

  initViewState() {
    this.modelUpdate(this.model.modelToView);
  }

  modelUpdate(keys) {
    for (const key of keys) {
      const value = this.model.programState.resolved.get(key);
      if (value && value.value !== undefined) {
        this.programState.registerEvent(key, value.value);
      }
    }
  }

  announcer(varName, value) {
    if (this.model.viewToModel.has(varName)) {
      this.publish(this.model.id, "viewMessage", {name: varName, value: value});
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
