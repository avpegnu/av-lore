import fs from 'node:fs';
import path from 'node:path';
const directories = ['handbook','glossary'].map(name=>path.resolve(import.meta.dirname, '../src/content/'+name));
export function handbookTranslations({runtime=false}={}) {
  const dictionary = {};
  function add(key,value){
    key=key.replace(/\s+/g,' ').trim();
    if(dictionary[key]&&dictionary[key]!==value)
      throw new Error('Ambiguous authored English translation: '+key);
    dictionary[key]=value;
  }
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.vi === 'string' && typeof value.en === 'string') {
      add(value.vi,value.en);
      if(!runtime){
        add(value.vi+' →',value.en+' →');
        add(value.vi+' · AV Lore',value.en+' · AV Lore');
      }
      return;
    }
    for (const child of Object.values(value)) visit(child);
  }
  for (const directory of directories) if (fs.existsSync(directory))
    for (const file of fs.readdirSync(directory).filter((f) => f.endsWith('.json')))
      visit(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
  return dictionary;
}
