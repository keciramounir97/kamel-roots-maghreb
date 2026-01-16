const fs=require('fs');
const src=fs.readFileSync('server.js','utf8');
const tables=new Set();
const regex=/pool\.query\(\s*[\\\\"\']([^\\\\"\']+)/g;
let m;
while((m=regex.exec(src))){
  const sql=m[1];
  const matches=sql.match(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-zA-Z0-9_]+)/g)||[];
  matches.forEach(t=>{
    const name=t.split(/\s+/)[1];
    if(name) tables.add(name.toLowerCase());
  });
}
console.log([...tables].sort().join('\n'));
