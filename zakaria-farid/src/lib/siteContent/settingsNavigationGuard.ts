// One active Settings editor owns the navigation decision, including programmatic callers.
let guard: ((target:string)=>boolean)|undefined;
export function installSettingsNavigationGuard(next:(target:string)=>boolean) {
  guard=next;
  return ()=>{if(guard===next)guard=undefined;};
}
export function requestSettingsNavigation(target:string):boolean {
  return guard?guard(target):true;
}
