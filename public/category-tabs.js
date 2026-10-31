(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CercleCategories=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const preferred=['Jeux','Pratique','Maison','Cuisine','Loisirs','Documents','Cartes et navigation'];
 const category=app=>typeof app.category==='string'&&app.category.trim()?app.category.trim():'Pratique';
 function names(apps){const found=new Set(apps.map(category));return['Tout',...preferred.filter(x=>found.delete(x)),...[...found].sort((a,b)=>a.localeCompare(b,'fr'))];}
 function matches(app,name){return name==='Tout'||category(app)===name;}
 function origin(app,name){return name==='Tout'||(name==='Applications externes'?!!app.external:name==='Mes ajouts'?!!app.personal:!app.external&&!app.personal);}
 function filter(apps,{selected='Tout',source='Tout',query=''}={}){const needle=query.trim().toLocaleLowerCase('fr');return apps.filter(a=>matches(a,selected)&&origin(a,source)&&(a.name+' '+a.description+' '+(a.author||'')).toLocaleLowerCase('fr').includes(needle));}
 function count(apps,name,source='Tout'){return apps.filter(a=>matches(a,name)&&origin(a,source)).length;}
 return Object.freeze({category,names,matches,origin,filter,count});
});
