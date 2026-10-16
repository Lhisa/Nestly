export type DataModel='legacy'|'products-v1';
export function selectFrontendModel(value?:string):DataModel{if(value===undefined||value==='legacy')return 'legacy';if(value==='products-v1')return value;throw Error('Configuració del model invàlida.');}
/** Fail closed: mai fallback a l'altre model ni reintents d'escriptura. */
export async function verifyBackendModel(expected:DataModel){
 const response=await fetch('/api/runtime-model',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok||(await response.json()).model!==expected)throw Error('L’aplicació està en manteniment o les versions no coincideixen. Recarrega la pàgina més tard.');
}
