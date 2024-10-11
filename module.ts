type _ModuleBasicDef<DEPS extends Record<string, _ModuleBasicDef<any>>> = {
  id: string;
  build: (deps: DEPS) => Record<string, any>;
};

export type ModuleInstance<DEF extends _ModuleBasicDef<any>> = Awaited<ReturnType<DEF["build"]>>;

export const defineModule = <DEPS extends Record<string, _ModuleBasicDef<any>>, INST>(
  id: string,
  deps: DEPS,
  build: (deps: { [ELEM in keyof DEPS]: ModuleInstance<DEPS[ELEM]> }) => INST,
  init?: (self: INST) => Promise<void>,
  cleanup?: (self: INST) => Promise<void>,
) => ({ id, deps, build, init, cleanup });

export type ModuleDef = ReturnType<typeof defineModule>;

export const wireModules = <DEFS extends Record<string, _ModuleBasicDef<any>>>(moduleDefs: DEFS) => {
  const env = {} as any;

  const proxiedEnv = new Proxy(env, {
    get(target, prop) {
      if (prop in target) return target[prop];
      throw new Error(`Module ${prop.toString()} not found`);
    },
  });
  
  const buildModule = (env: any, moduleDef: ModuleDef, alias: string) => {
    if (moduleDef.id in env) {
      env[alias] = env[moduleDef.id];
      return env; // don't build the same module twice
    }
    console.info(`Building module ${moduleDef.id}...`);
    for (const [alias, dep] of Object.entries(moduleDef.deps)){
      buildModule(env, dep as any, alias); // recursively build dependencies
    }
    env[moduleDef.id] = moduleDef.build(proxiedEnv);
    env[alias] = env[moduleDef.id];
    return env;
  }

  for (const [alias, moduleDef] of Object.entries(moduleDefs))
    buildModule(env, moduleDef as any, alias);

  return proxiedEnv as { [ELEM in keyof DEFS]: ModuleInstance<DEFS[ELEM]> };
};