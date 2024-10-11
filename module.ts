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
  
  const buildModule = (env: any, moduleDef: ModuleDef) => {
    if (moduleDef.id in env) return env; // don't build the same module twice
    console.info(`Building module ${moduleDef.id}...`);
    for (const dep of Object.values(moduleDef.deps))
      buildModule(env, dep as any); // recursively build dependencies
    env[moduleDef.id] = moduleDef.build(env);
    return env;
  }

  for (const moduleDef of Object.values(moduleDefs))
    buildModule(env, moduleDef as any);

  return env as { [ELEM in keyof DEFS]: ModuleInstance<DEFS[ELEM]> };
};