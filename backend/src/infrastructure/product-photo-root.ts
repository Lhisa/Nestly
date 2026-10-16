import {access,lstat,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,isAbsolute,join,parse,resolve} from 'node:path';
import {tmpdir} from 'node:os';
/** Validació sense crear directoris o fitxers. L'ACL privada es prepara explícitament. */
export async function validateProductPhotoRoot(root:string,allowTemporary=false){
 if(!isAbsolute(root))throw Error('NESTLY_PHOTO_ROOT ha de ser absoluta');
 const stat=await lstat(root);if(!stat.isDirectory())throw Error('Arrel fotogràfica no és un directori');
 if(process.platform!=='win32'&&(stat.mode&0o077)!==0)throw Error('Arrel fotogràfica no privada');
 const canonical=await realpath(root);
 if((await lstat(root)).isSymbolicLink()||canonical.toLowerCase()!==resolve(root).toLowerCase())throw Error('Arrel fotogràfica enllaçada');
 const temp=resolve(tmpdir()).toLowerCase();if(!allowTemporary&&(canonical.toLowerCase()===temp||canonical.toLowerCase().startsWith(temp+'\\')||canonical.toLowerCase().startsWith(temp+'/')))throw Error('Arrel fotogràfica temporal');
 let current=canonical;while(true){try{await lstat(join(current,'.git'));throw Error('Arrel dins de Git');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}if(current===parse(current).root)break;current=dirname(current);}
 await access(canonical,constants.R_OK|constants.W_OK);
 try{const items=await lstat(join(canonical,'items'));if(items.isSymbolicLink()||!items.isDirectory())throw Error('Directori items insegur');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
}
