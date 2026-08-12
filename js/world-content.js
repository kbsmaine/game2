(function(){
  'use strict';

  // Additive raid-world pack. The core game supplies combat, loot, interactions,
  // model loading, and player movement; this file only composes new environments.
  const maps={
    emberwood:{
      name:'Emberwood Estates',
      code:'ZONE // EW-09',
      difficulty:'HIGH',
      loot:'HOUSEHOLD · TOOLS · VALUABLES',
      description:'A burned suburban district of breached homes, fenced gardens and an abandoned corner market. Multi-level interiors conceal dense civilian salvage.',
      spawn:[0,1.75,-63],
      extract:[58,.08,57],
      fog:'#171915'
    },
    oldtown:{
      name:'Saint Marrow',
      code:'ZONE // SM-21',
      difficulty:'SEVERE',
      loot:'TECH · MEDICAL · WEAPONS',
      description:'The ruined old-town blocks around Saint Marrow apartments. Search stacked residences, shops, alleys and a fenced contractor yard.',
      spawn:[0,1.75,-64],
      extract:[-59,.08,58],
      fog:'#171817'
    }
  };

  const FLOOR_HEIGHT=3.25;
  let serial=0;
  const nextName=prefix=>'world_'+prefix+'_'+(++serial);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function palette(scene,api,prefix,colors={}){
    const make=(name,color,emissive)=>api.mat(scene,prefix+'_'+name,color,emissive);
    return{
      road:make('road',colors.road||'#202421'),
      roadEdge:make('roadEdge',colors.roadEdge||'#30342f'),
      line:make('line','#a89c72','#302c1f'),
      concrete:make('concrete',colors.concrete||'#55574f'),
      wall:make('wall',colors.wall||'#5d6259'),
      wallAlt:make('wallAlt',colors.wallAlt||'#666056'),
      trim:make('trim',colors.trim||'#292d29'),
      interior:make('interior',colors.interior||'#77736a'),
      floor:make('floor',colors.floor||'#3c3b36'),
      roof:make('roof',colors.roof||'#252725'),
      glass:make('glass','#17201d','#0a100e'),
      wood:make('wood','#4b3628'),
      rust:make('rust','#5b3325'),
      metal:make('metal','#303633'),
      tire:make('tire','#101312'),
      hedge:make('hedge','#263c28'),
      deadGrass:make('deadGrass','#696345'),
      carpetRed:make('carpetRed','#5b2928'),
      carpetBlue:make('carpetBlue','#293c48'),
      carpetGold:make('carpetGold','#655435'),
      pictureA:make('pictureA','#68413a','#1b0c09'),
      pictureB:make('pictureB','#35525a','#0b1518'),
      light:make('light','#bca56f','#a77832')
    }
  }

  function block(scene,name,size,pos,material,opts={}){
    const mesh=BABYLON.MeshBuilder.CreateBox(nextName(name),{width:size[0],height:size[1],depth:size[2]},scene);
    mesh.position=new BABYLON.Vector3(pos[0],pos[1],pos[2]);
    const rotation=opts.rotation||[0,opts.rotationY||0,0];
    mesh.rotation=new BABYLON.Vector3(rotation[0]||0,rotation[1]||0,rotation[2]||0);
    mesh.material=material;
    mesh.checkCollisions=!!opts.collide;
    mesh.isPickable=opts.pickable!==false;
    mesh.receiveShadows=true;
    mesh.metadata={...(mesh.metadata||{}),worldContent:true};
    if(opts.visible===false){mesh.visibility=0;mesh.isPickable=false;mesh.metadata.ignoreBullet=true}
    else if(!mesh.isPickable)mesh.metadata.ignoreBullet=true;
    return mesh
  }

  function cylinder(scene,name,diameter,height,pos,material,opts={}){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(nextName(name),{diameter,height,tessellation:opts.tessellation||12},scene);
    mesh.position=new BABYLON.Vector3(pos[0],pos[1],pos[2]);
    const rotation=opts.rotation||[0,opts.rotationY||0,0];
    mesh.rotation=new BABYLON.Vector3(rotation[0]||0,rotation[1]||0,rotation[2]||0);
    mesh.material=material;
    mesh.checkCollisions=!!opts.collide;
    mesh.isPickable=opts.pickable!==false;
    mesh.receiveShadows=true;
    mesh.metadata={...(mesh.metadata||{}),worldContent:true};
    if(!mesh.isPickable)mesh.metadata.ignoreBullet=true;
    return mesh
  }

  function sphere(scene,name,diameter,pos,material,opts={}){
    const mesh=BABYLON.MeshBuilder.CreateSphere(nextName(name),{diameter,segments:opts.segments||8},scene);
    mesh.position=new BABYLON.Vector3(pos[0],pos[1],pos[2]);
    mesh.scaling=new BABYLON.Vector3(...(opts.scale||[1,1,1]));
    mesh.material=material;
    mesh.checkCollisions=!!opts.collide;
    mesh.isPickable=opts.pickable!==false;
    mesh.receiveShadows=true;
    mesh.metadata={...(mesh.metadata||{}),worldContent:true};
    if(!mesh.isPickable)mesh.metadata.ignoreBullet=true;
    return mesh
  }

  function rotateOffset(lx,lz,rotationY){
    const c=Math.cos(rotationY),s=Math.sin(rotationY);
    return[lx*c+lz*s,-lx*s+lz*c]
  }

  function road(scene,m,x,z,width,depth){
    block(scene,'road',[width,.055,depth],[x,.045,z],m.road,{collide:false});
    if(depth>width){
      block(scene,'sidewalk',[1.8,.09,depth],[x-width/2-1,.055,z],m.roadEdge,{collide:false});
      block(scene,'sidewalk',[1.8,.09,depth],[x+width/2+1,.055,z],m.roadEdge,{collide:false})
    }else{
      block(scene,'sidewalk',[width,.09,1.8],[x,.055,z-depth/2-1],m.roadEdge,{collide:false});
      block(scene,'sidewalk',[width,.09,1.8],[x,.055,z+depth/2+1],m.roadEdge,{collide:false})
    }
  }

  function roadDashes(scene,m,x,z,length,axis='z'){
    for(let p=-length/2+4;p<length/2-2;p+=7){
      const size=axis==='z'?[.18,.018,3.1]:[3.1,.018,.18];
      const pos=axis==='z'?[x,.081,z+p]:[x+p,.081,z];
      block(scene,'road_dash',size,pos,m.line,{collide:false,pickable:false})
    }
  }

  function roadCracks(scene,m,points){
    for(const p of points){
      block(scene,'road_crack',[p[2]||2,.018,.055],[p[0],.084,p[1]],m.trim,{rotationY:p[3]||0,collide:false,pickable:false});
      block(scene,'road_crack_branch',[Math.max(.45,(p[2]||2)*.45),.018,.045],[p[0]+.25,.085,p[1]+.18],m.trim,{rotationY:(p[3]||0)+.8,collide:false,pickable:false})
    }
  }

  function segmentedWall(scene,name,axis,length,center,baseY,height,thickness,material,opening=null){
    const half=length/2;
    const addPart=(start,end,y=baseY,h=height)=>{
      const span=end-start;if(span<=.035||h<=.035)return;
      const along=(start+end)/2;
      const size=axis==='x'?[span,h,thickness]:[thickness,h,span];
      const pos=axis==='x'?[center[0]+along,y+h/2,center[1]]:[center[0],y+h/2,center[1]+along];
      block(scene,name,size,pos,material,{collide:true})
    };
    if(!opening){addPart(-half,half);return}
    const openWidth=clamp(opening.width||1.25,.75,length-.2);
    const openCenter=clamp(opening.center||0,-half+openWidth/2,half-openWidth/2);
    const openMin=openCenter-openWidth/2,openMax=openCenter+openWidth/2;
    addPart(-half,openMin);addPart(openMax,half);
    const openHeight=clamp(opening.height||2.35,.8,height);
    if(openHeight<height)addPart(openMin,openMax,baseY+openHeight,height-openHeight)
  }

  function floorWithOpening(scene,m,b,levelY,opening){
    const slab=.16,xMin=b.x-b.w/2+.24,xMax=b.x+b.w/2-.24,zMin=b.z-b.d/2+.24,zMax=b.z+b.d/2-.24;
    const oxMin=opening.x-opening.w/2,oxMax=opening.x+opening.w/2,ozMin=opening.z-opening.d/2,ozMax=opening.z+opening.d/2;
    const rect=(xa,xb,za,zb)=>{
      if(xb-xa<.04||zb-za<.04)return;
      block(scene,'upper_floor',[xb-xa,slab,zb-za],[(xa+xb)/2,levelY-slab/2,(za+zb)/2],m.floor,{collide:true})
    };
    rect(xMin,oxMin,zMin,zMax);rect(oxMax,xMax,zMin,zMax);
    rect(oxMin,oxMax,zMin,ozMin);rect(oxMin,oxMax,ozMax,zMax)
  }

  function stairFlight(scene,m,baseY,x,z,rise,run,width){
    const angle=Math.atan2(rise,run),slopeLength=Math.hypot(rise,run),startZ=z-run/2,endZ=z+run/2;
    const ramp=block(scene,'stair_ramp',[width,.14,slopeLength],[x,baseY+rise/2-.025,z],m.floor,{rotation:[-angle,0,0],collide:false,pickable:false,visible:false});
    ramp.metadata.stairRamp=true;
    scene.metadata=scene.metadata||{};
    (scene.metadata.deadhaulStairFlights||(scene.metadata.deadhaulStairFlights=[])).push({x,startZ,endZ,width,baseY,rise});
    const steps=15,stepDepth=run/steps;
    for(let i=0;i<steps;i++){
      const top=baseY+(i+1)*rise/steps;
      block(scene,'stair_tread',[width-.08,.12,stepDepth+.035],[x,top-.06,startZ+(i+.5)*stepDepth],m.wood,{collide:false})
    }
    // Landings bridge the safety margin cut into each floor slab. The lower
    // landing is essential for stacked flights: it prevents a narrow drop
    // between the upper-floor slab and the next ramp.
    block(scene,'stair_landing',[width,.14,.82],[x,baseY-.07,startZ-.39],m.wood,{collide:false});
    block(scene,'stair_landing',[width,.14,.82],[x,baseY+rise-.07,endZ+.39],m.wood,{collide:false});
    for(const side of[-1,1]){
      const railX=x+side*(width/2+.055);
      block(scene,'stair_guard',[.08,rise+1.05,run+.76],[railX,baseY+(rise+1.05)/2,z+.08],m.trim,{collide:true,pickable:false,visible:false});
      block(scene,'stair_handrail',[.07,.07,slopeLength],[railX,baseY+rise/2+.86,z],m.metal,{rotation:[-angle,0,0],collide:false});
      for(const zz of[startZ,z,endZ]){
        const t=(zz-startZ)/run;
        cylinder(scene,'stair_post',.07,.88,[railX,baseY+t*rise+.44,zz],m.metal,{collide:false})
      }
    }
  }

  function addWindow(scene,m,axis,x,y,z){
    const glassSize=axis==='x'?[1.9,1.22,.045]:[.045,1.22,1.9];
    block(scene,'window',glassSize,[x,y,z],m.glass,{collide:false,pickable:false});
    const crossA=axis==='x'?[.07,1.32,.065]:[.065,1.32,.07];
    const crossB=axis==='x'?[2.02,.065,.065]:[.065,.065,2.02];
    block(scene,'window_frame',crossA,[x,y,z],m.trim,{collide:false,pickable:false});
    block(scene,'window_frame',crossB,[x,y,z],m.trim,{collide:false,pickable:false})
  }

  function addStoryWindows(scene,m,b,level){
    const y=level*FLOOR_HEIGHT+1.72,front=b.z-b.d/2-.166,back=b.z+b.d/2+.166,left=b.x-b.w/2-.166,right=b.x+b.w/2+.166;
    for(const lx of[-b.w*.28,b.w*.3]){addWindow(scene,m,'x',b.x+lx,y,front);addWindow(scene,m,'x',b.x+lx,y,back)}
    for(const lz of[-b.d*.24,b.d*.24]){addWindow(scene,m,'z',left,y,b.z+lz);addWindow(scene,m,'z',right,y,b.z+lz)}
  }

  function rug(scene,m,x,z,w,d,levelY,color='carpetRed'){
    block(scene,'rug',[w,.025,d],[x,levelY+.017,z],m[color]||m.carpetRed,{collide:false,pickable:false})
  }

  function pictureZ(scene,m,x,y,z,color='pictureA'){
    block(scene,'picture_frame',[1.55,1.02,.075],[x,y,z],m.wood,{collide:false});
    block(scene,'painting',[1.3,.77,.04],[x,y,z-.045],m[color]||m.pictureA,{collide:false})
  }

  function pictureX(scene,m,x,y,z,color='pictureB'){
    block(scene,'picture_frame',[.075,1.02,1.55],[x,y,z],m.wood,{collide:false});
    block(scene,'painting',[.04,.77,1.3],[x-.045,y,z],m[color]||m.pictureB,{collide:false})
  }

  function addInteriorLight(scene,m,x,y,z,intensity=.42){
    sphere(scene,'lamp_glow',.18,[x,y,z],m.light,{collide:false,pickable:false});
    const light=new BABYLON.PointLight(nextName('interior_light'),new BABYLON.Vector3(x,y-.12,z),scene);
    light.diffuse=new BABYLON.Color3(.82,.68,.45);light.intensity=intensity;light.range=11
  }

  function createBuilding(scene,m,spec){
    const b={...spec,stories:spec.stories||1,floorHeight:FLOOR_HEIGHT};
    const wallThickness=.3,storyHeight=FLOOR_HEIGHT,doorX=spec.frontDoorX??b.w*.2;
    const stairWidth=2.05,stairRun=Math.min(5.9,b.d-2.1),stairX=b.x+b.w/2-2.05,stairZ=b.z+.25;
    const opening={x:stairX,z:stairZ,w:stairWidth+.45,d:stairRun+.82};
    for(let level=0;level<b.stories;level++){
      const baseY=level*storyHeight,wallMat=level%2?m.wallAlt:m.wall;
      segmentedWall(scene,b.name+'_front','x',b.w,[b.x,b.z-b.d/2],baseY,storyHeight,wallThickness,wallMat,level===0?{center:doorX,width:1.55,height:2.42}:null);
      segmentedWall(scene,b.name+'_back','x',b.w,[b.x,b.z+b.d/2],baseY,storyHeight,wallThickness,wallMat,level===0&&spec.backDoor?{center:-b.w*.22,width:1.35,height:2.32}:null);
      segmentedWall(scene,b.name+'_left','z',b.d,[b.x-b.w/2,b.z],baseY,storyHeight,wallThickness,wallMat);
      segmentedWall(scene,b.name+'_right','z',b.d,[b.x+b.w/2,b.z],baseY,storyHeight,wallThickness,wallMat);
      segmentedWall(scene,b.name+'_hall','z',b.d-1.0,[b.x-b.w*.055,b.z],baseY,storyHeight-.12,.18,m.interior,{center:-b.d*.22,width:1.25,height:2.28});
      if(b.w>=19)segmentedWall(scene,b.name+'_room','x',b.w*.43,[b.x-b.w*.285,b.z+b.d*.12],baseY,storyHeight-.12,.18,m.interior,{center:0,width:1.18,height:2.25});
      if(level>0)floorWithOpening(scene,m,b,baseY,opening);
      addStoryWindows(scene,m,b,level);
      addInteriorLight(scene,m,b.x-b.w*.27,baseY+storyHeight-.35,b.z-b.d*.12,level===0?.4:.32);
      if(level<b.stories-1)stairFlight(scene,m,baseY,stairX,stairZ,storyHeight,stairRun,stairWidth)
    }
    block(scene,b.name+'_foundation',[b.w-.34,.08,b.d-.34],[b.x,.01,b.z],m.floor,{collide:false});
    block(scene,b.name+'_porch',[4.2,.12,2.2],[b.x+doorX,.06,b.z-b.d/2-1.08],m.concrete,{collide:false});
    for(const xOff of[-1.55,1.55])block(scene,'porch_post',[.14,2.45,.14],[b.x+doorX+xOff,1.23,b.z-b.d/2-1.85],m.trim,{collide:true});
    block(scene,'porch_awning',[4.15,.14,2.15],[b.x+doorX,2.43,b.z-b.d/2-1.08],m.roof,{collide:false});
    const roofY=b.stories*storyHeight;
    if(spec.roof==='gable'){
      const rise=1.65,halfRun=b.w/2+.35,panelWidth=Math.hypot(halfRun,rise),angle=Math.atan2(rise,halfRun);
      block(scene,b.name+'_roof',[panelWidth,.18,b.d+1.0],[b.x-halfRun/2,roofY+rise/2,b.z],m.roof,{rotation:[0,0,angle],collide:false});
      block(scene,b.name+'_roof',[panelWidth,.18,b.d+1.0],[b.x+halfRun/2,roofY+rise/2,b.z],m.roof,{rotation:[0,0,-angle],collide:false})
    }else{
      block(scene,b.name+'_roof',[b.w+.35,.22,b.d+.35],[b.x,roofY+.08,b.z],m.roof,{collide:true});
      block(scene,'parapet',[b.w+.65,.58,.18],[b.x,roofY+.38,b.z-b.d/2-.18],m.trim,{collide:true});
      block(scene,'parapet',[b.w+.65,.58,.18],[b.x,roofY+.38,b.z+b.d/2+.18],m.trim,{collide:true});
      block(scene,'parapet',[.18,.58,b.d+.65],[b.x-b.w/2-.18,roofY+.38,b.z],m.trim,{collide:true});
      block(scene,'parapet',[.18,.58,b.d+.65],[b.x+b.w/2+.18,roofY+.38,b.z],m.trim,{collide:true})
    }
    return{...b,stairX,stairZ,stairRun,opening}
  }

  function fenceRun(scene,m,a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.15)return;
    const ry=Math.atan2(dx,dz),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
    block(scene,'fence_collision',[.12,1.42,length],[cx,.71,cz],m.wood,{rotationY:ry,collide:true,pickable:false,visible:false});
    for(const y of[.43,1.12])block(scene,'fence_rail',[.09,.11,length],[cx,y,cz],m.wood,{rotationY:ry,collide:false});
    const posts=Math.max(1,Math.ceil(length/2.35));
    for(let i=0;i<=posts;i++){
      const t=i/posts;
      block(scene,'fence_post',[.17,1.55,.17],[a[0]+dx*t,.775,a[1]+dz*t],m.wood,{rotationY:ry,collide:false})
    }
  }

  function fencedProperty(scene,m,x,z,w,d,gateX=x){
    const left=x-w/2,right=x+w/2,front=z-d/2,back=z+d/2,gap=3.2;
    fenceRun(scene,m,[left,front],[clamp(gateX-gap/2,left,right),front]);
    fenceRun(scene,m,[clamp(gateX+gap/2,left,right),front],[right,front]);
    fenceRun(scene,m,[left,back],[right,back]);fenceRun(scene,m,[left,front],[left,back]);fenceRun(scene,m,[right,front],[right,back])
  }

  function hedgeRun(scene,m,a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.2)return;
    const ry=Math.atan2(dx,dz),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
    block(scene,'hedge_collision',[.72,1.5,length],[cx,.75,cz],m.hedge,{rotationY:ry,collide:true,pickable:false,visible:false});
    const count=Math.max(2,Math.ceil(length/1.15));
    for(let i=0;i<=count;i++){
      const t=i/count,wave=Math.sin(i*2.13)*.08;
      sphere(scene,'hedge',1.25,[a[0]+dx*t,.76+wave,a[1]+dz*t],m.hedge,{scale:[.78,.78+wave,.7],collide:false})
    }
  }

  function wreckedCar(scene,m,x,z,rotationY=0,color='rust'){
    const material=m[color]||m.rust,at=(lx,ly,lz)=>{const p=rotateOffset(lx,lz,rotationY);return[x+p[0],ly,z+p[1]]};
    block(scene,'car_body',[1.82,.52,3.85],at(0,.55,0),material,{rotationY,collide:true});
    block(scene,'car_cabin',[1.55,.68,1.85],at(0,1.06,.18),m.trim,{rotationY,collide:true});
    block(scene,'car_window',[1.59,.43,1.25],at(0,1.12,.12),m.glass,{rotationY,collide:false,pickable:false});
    for(const lx of[-.94,.94])for(const lz of[-1.2,1.2]){
      const p=at(lx,.38,lz);
      cylinder(scene,'car_wheel',.63,.24,p,m.tire,{rotation:[0,rotationY,Math.PI/2],collide:false})
    }
    block(scene,'broken_bumper',[1.75,.16,.18],at(.18,.22,-2.0),m.metal,{rotation:[0,rotationY+.13,.08],collide:false})
  }

  function streetLamp(scene,m,x,z){
    cylinder(scene,'street_lamp',.14,4.7,[x,2.35,z],m.metal,{collide:true});
    block(scene,'street_lamp_arm',[.08,.08,1.0],[x+.43,4.55,z],m.metal,{collide:false});
    sphere(scene,'street_lamp_glow',.22,[x+.86,4.42,z],m.light,{collide:false,pickable:false})
  }

  function model(api,scene,file,x,y,z,rotationY=0,scale=1,collision=true){
    return api.loadModel(scene,file,[x,y,z],{rotationY,scale,collision})
  }

  function scatterModels(api,scene,entries){
    return entries.map(e=>model(api,scene,e[0],e[1],e[2]||0,e[3],e[4]||0,e[5]??1,e[6]??false))
  }

  function furnishEmberwood(scene,api,m,h1,h2,market,burned){
    const jobs=[];
    // Willow house: kitchen/living room below, bedrooms and office above.
    jobs.push(
      model(api,scene,'fridge',h1.x-5.7,0,h1.z+5.6,Math.PI),
      model(api,scene,'wood_table',h1.x-4.6,0,h1.z-3.6,0),
      model(api,scene,'chair',h1.x-5.9,0,h1.z-3.6,Math.PI/2),
      model(api,scene,'chair',h1.x-3.3,0,h1.z-3.6,-Math.PI/2),
      model(api,scene,'office_desk',h1.x-4.8,0,h1.z+2.4,Math.PI/2),
      model(api,scene,'monitor',h1.x-4.8,.98,h1.z+2.4,Math.PI/2,.9,false),
      model(api,scene,'hospital_bed',h1.x-5.0,FLOOR_HEIGHT,h1.z-3.2,Math.PI/2),
      model(api,scene,'hospital_bed',h1.x-4.8,FLOOR_HEIGHT,h1.z+3.6,Math.PI/2),
      model(api,scene,'office_desk',h1.x+1.4,FLOOR_HEIGHT,h1.z-4.7,0),
      model(api,scene,'chair',h1.x+1.4,FLOOR_HEIGHT,h1.z-3.7,Math.PI)
    );
    rug(scene,m,h1.x-4.4,h1.z-3.6,5.0,3.8,0,'carpetRed');rug(scene,m,h1.x-4.5,h1.z+2.7,4.8,4.2,FLOOR_HEIGHT,'carpetBlue');
    pictureX(scene,m,h1.x-h1.w/2+.2,1.72,h1.z-2.2,'pictureB');pictureZ(scene,m,h1.x-4.5,FLOOR_HEIGHT+1.72,h1.z+h1.d/2-.2,'pictureA');

    // Hawthorn residence: dining room, sitting room and two occupied bedrooms.
    jobs.push(
      model(api,scene,'fridge',h2.x-5.5,0,h2.z+5.5,Math.PI),
      model(api,scene,'wood_table',h2.x-4.4,0,h2.z-3.8,.08),
      model(api,scene,'chair',h2.x-5.7,0,h2.z-3.7,Math.PI/2),
      model(api,scene,'chair',h2.x-3.1,0,h2.z-3.8,-Math.PI/2),
      model(api,scene,'metal_shelf',h2.x+1.5,0,h2.z+5.6,Math.PI),
      model(api,scene,'hospital_bed',h2.x-5.0,FLOOR_HEIGHT,h2.z-3.7,Math.PI/2),
      model(api,scene,'office_desk',h2.x-4.8,FLOOR_HEIGHT,h2.z+3.9,Math.PI/2),
      model(api,scene,'monitor',h2.x-4.8,FLOOR_HEIGHT+.98,h2.z+3.9,Math.PI/2,.9,false),
      model(api,scene,'chair',h2.x-3.7,FLOOR_HEIGHT,h2.z+3.9,-Math.PI/2)
    );
    rug(scene,m,h2.x-4.5,h2.z-3.6,5.2,4.1,0,'carpetGold');rug(scene,m,h2.x-4.5,h2.z+3.7,4.7,4,FLOOR_HEIGHT,'carpetRed');
    pictureZ(scene,m,h2.x-4.5,1.7,h2.z+h2.d/2-.2,'pictureA');pictureX(scene,m,h2.x-h2.w/2+.2,FLOOR_HEIGHT+1.7,h2.z+3.2,'pictureB');

    // Market and burned ranch house.
    jobs.push(
      model(api,scene,'cash_register',market.x-4.8,1.02,market.z-market.d/2+2.4,0,.9,false),
      model(api,scene,'office_desk',market.x-4.8,0,market.z-market.d/2+2.5,0),
      model(api,scene,'fridge',market.x-6.8,0,market.z+4.8,Math.PI),
      model(api,scene,'metal_shelf',market.x-2.5,0,market.z+1.0,0),
      model(api,scene,'metal_shelf',market.x+1.0,0,market.z+1.0,0),
      model(api,scene,'metal_shelf',market.x+4.4,0,market.z+1.0,0),
      model(api,scene,'cardboard_box',market.x+6.7,0,market.z+4.7,.2),
      model(api,scene,'cardboard_box',market.x+5.8,0,market.z+4.3,-.3),
      model(api,scene,'hospital_bed',burned.x-4.2,0,burned.z-2.8,Math.PI/2),
      model(api,scene,'wood_table',burned.x-4.3,0,burned.z+3.4,.35),
      model(api,scene,'chair',burned.x-3.0,0,burned.z+3.5,-1.1)
    );
    rug(scene,m,market.x-3.2,market.z-3.7,5.5,2.1,0,'carpetBlue');rug(scene,m,burned.x-4.2,burned.z-2.8,4.5,3.5,0,'carpetRed');
    pictureZ(scene,m,burned.x-4.2,1.7,burned.z+burned.d/2-.2,'pictureB');
    return jobs
  }

  async function buildEmberwood(scene,api){
    const m=palette(scene,api,'emberwood',{road:'#20231f',wall:'#626559',wallAlt:'#56594f',interior:'#757065',floor:'#3a3933',roof:'#292b27'});
    road(scene,m,0,0,15,146);road(scene,m,0,-38,130,15);road(scene,m,0,18,130,15);
    roadDashes(scene,m,0,0,142,'z');roadDashes(scene,m,0,-38,126,'x');roadDashes(scene,m,0,18,126,'x');
    roadCracks(scene,m,[[-2,-53,2.5,.4],[4,-25,2.1,-.5],[-44,-36,3,.2],[35,-34,2.5,-.8],[-28,19,2.8,.4],[42,17,2.2,-.3],[2,46,2.4,.75]]);

    const h1=createBuilding(scene,m,{name:'willow_house',x:-26,z:-20,w:17,d:16,stories:2,roof:'gable',backDoor:true});
    const h2=createBuilding(scene,m,{name:'hawthorn_house',x:27,z:34,w:18,d:17,stories:2,roof:'gable',backDoor:true});
    const market=createBuilding(scene,m,{name:'ember_market',x:29,z:-17,w:20,d:15,stories:1,roof:'flat',frontDoorX:0,backDoor:true});
    const burned=createBuilding(scene,m,{name:'burned_ranch',x:-28,z:36,w:17,d:14,stories:1,roof:'gable',frontDoorX:2.1,backDoor:true});

    fencedProperty(scene,m,h1.x,h1.z,25,18,h1.x+3.4);
    fencedProperty(scene,m,burned.x,burned.z,25,22,burned.x+2.1);
    hedgeRun(scene,m,[17,22],[17,47]);hedgeRun(scene,m,[17,47],[39,47]);hedgeRun(scene,m,[39,47],[39,24]);
    hedgeRun(scene,m,[18,-27],[18,-8]);

    wreckedCar(scene,m,-4,-23,.18,'rust');wreckedCar(scene,m,5,5,-.42,'metal');wreckedCar(scene,m,-34,18,Math.PI/2+.12,'rust');wreckedCar(scene,m,42,-35,Math.PI/2-.1,'wallAlt');
    for(const p of[[-9,-47],[9,-21],[-9,3],[9,31],[-9,55]])streetLamp(scene,m,p[0],p[1]);

    const assets=[];
    assets.push(...furnishEmberwood(scene,api,m,h1,h2,market,burned));
    assets.push(
      model(api,scene,'wrecked_pickup',7,0,43,-.45),
      model(api,scene,'dumpster',39,0,-8,-.25),
      model(api,scene,'pallet',35,0,-9,.1),
      model(api,scene,'pallet',37.5,0,-9,-.08),
      model(api,scene,'barrel',41,0,-11,.2),
      model(api,scene,'barrel',43,0,-11,-.2),
      model(api,scene,'concrete_barrier',-8,0,-57,Math.PI/2),
      model(api,scene,'concrete_barrier',8,0,-52,Math.PI/2),
      model(api,scene,'warning_sign',5,0,-49,Math.PI)
    );
    assets.push(...scatterModels(api,scene,[
      ['dead_tree',-50,0,-47,.2,1.15,false],['dead_tree',-45,0,8,-.4,.95,false],['dead_tree',-48,0,57,.1,1.2,false],
      ['dead_tree',49,0,-52,-.2,1.1,false],['dead_tree',52,0,6,.35,.9,false],['dead_tree',47,0,52,-.3,1.15,false],
      ['bush',-39,0,-45,.1,1.1,false],['bush',-45,0,-7,.2,.9,false],['bush',-41,0,49,-.1,1.2,false],
      ['bush',45,0,-26,.2,1.0,false],['bush',48,0,24,-.2,1.1,false],['bush',14,0,55,.1,.9,false],
      ['grass_clump',-14,0,-8,.2,1.1,false],['grass_clump',13,0,-12,-.2,.9,false],['grass_clump',-14,0,27,.1,1.2,false],
      ['grass_clump',13,0,3,-.1,1.0,false],['grass_clump',-50,0,25,.2,.9,false],['grass_clump',51,0,-4,-.2,1.1,false]
    ]));
    await Promise.allSettled(assets);

    await Promise.allSettled([
      api.spawnContainer(scene,'duffel',[h1.x-4.8,0,h1.z-5.5],{}),
      api.spawnContainer(scene,'filing',[h1.x-5.4,0,h1.z+5.0],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'medical',[h1.x-4.9,FLOOR_HEIGHT,h1.z-1.4],{}),
      api.spawnContainer(scene,'duffel',[h1.x+1.4,FLOOR_HEIGHT,h1.z+4.8],{}),
      api.spawnContainer(scene,'crate',[h2.x-5.7,0,h2.z+5.2],{}),
      api.spawnContainer(scene,'filing',[h2.x-5.0,FLOOR_HEIGHT,h2.z+4.7],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'duffel',[h2.x-4.9,FLOOR_HEIGHT,h2.z-5.4],{}),
      api.spawnContainer(scene,'medical',[h2.x+1.2,FLOOR_HEIGHT,h2.z+5.2],{}),
      api.spawnContainer(scene,'tools',[market.x+7.7,0,market.z+5.5],{rotationY:Math.PI}),
      api.spawnContainer(scene,'crate',[market.x+3.8,0,market.z+5.4],{}),
      api.spawnContainer(scene,'filing',[market.x-7.5,0,market.z+4.2],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'duffel',[market.x-1.0,0,market.z-4.9],{}),
      api.spawnContainer(scene,'crate',[burned.x-5.3,0,burned.z+4.7],{}),
      api.spawnContainer(scene,'duffel',[burned.x-4.3,0,burned.z-4.4],{}),
      api.spawnContainer(scene,'tools',[39,0,-7],{rotationY:-Math.PI/2}),
      api.spawnContainer(scene,'crate',[-43,0,7],{}),
      api.spawnLoose(scene,'wristwatch',[h1.x-4.8,FLOOR_HEIGHT+.88,h1.z+2.6]),
      api.spawnLoose(scene,'keycard',[h2.x-4.8,FLOOR_HEIGHT+.92,h2.z+3.8]),
      api.spawnLoose(scene,'copper_wire',[market.x+1.0,.85,market.z+1.0]),
      api.spawnLoose(scene,'fuel_can',[40,.35,-10])
    ]);

    api.createEnemy(scene,[-4,0,-28],{tier:2,weapon:'sks',lootProfile:'civilian'});
    api.createEnemy(scene,[-43,0,-8],{tier:1,weapon:'makarov',lootProfile:'civilian'});
    api.createEnemy(scene,[38,0,-5],{tier:2,weapon:'pump12',lootProfile:'industrial'});
    api.createEnemy(scene,[5,0,10],{tier:2,weapon:'mp5',lootProfile:'civilian'});
    api.createEnemy(scene,[-44,0,49],{tier:2,weapon:'ak74',lootProfile:'civilian'});
    api.createEnemy(scene,[43,0,48],{tier:3,weapon:'sks',lootProfile:'military'});
    api.createEnemy(scene,[8,0,39],{tier:1,weapon:'glock17',lootProfile:'civilian'})
  }

  function furnishOldTown(scene,api,m,apartment,hardware,rowhouse,pharmacy){
    const jobs=[];
    // Apartment: a lived-in room cluster on every accessible floor.
    for(let level=0;level<3;level++){
      const y=level*FLOOR_HEIGHT;
      jobs.push(
        model(api,scene,'hospital_bed',apartment.x-7.0,y,apartment.z-5.7,Math.PI/2),
        model(api,scene,'wood_table',apartment.x-6.1,y,apartment.z+4.9,.08),
        model(api,scene,'chair',apartment.x-7.35,y,apartment.z+4.9,Math.PI/2),
        model(api,scene,'chair',apartment.x-4.85,y,apartment.z+4.9,-Math.PI/2),
        model(api,scene,'office_desk',apartment.x+1.0,y,apartment.z-6.5,0),
        model(api,scene,'chair',apartment.x+1.0,y,apartment.z-5.4,Math.PI)
      );
      if(level!==1)jobs.push(model(api,scene,'fridge',apartment.x-8.8,y,apartment.z+7.8,Math.PI));
      rug(scene,m,apartment.x-6.1,apartment.z-5.3,6.2,4.5,y,level===1?'carpetBlue':'carpetRed');
      rug(scene,m,apartment.x-6.0,apartment.z+4.8,5.5,4.2,y,'carpetGold');
      pictureZ(scene,m,apartment.x-6.2,y+1.72,apartment.z+apartment.d/2-.2,level===1?'pictureB':'pictureA')
    }
    jobs.push(
      model(api,scene,'monitor',apartment.x+1.0,FLOOR_HEIGHT+.98,apartment.z-6.5,0,.9,false),
      model(api,scene,'filing_cabinet',apartment.x-9.2,FLOOR_HEIGHT,apartment.z-1.1,Math.PI/2)
    );

    // Contractor/hardware shop: shelves downstairs, abandoned offices upstairs.
    jobs.push(
      model(api,scene,'metal_shelf',hardware.x-6.6,0,hardware.z+5.5,Math.PI),
      model(api,scene,'metal_shelf',hardware.x-2.5,0,hardware.z+5.5,Math.PI),
      model(api,scene,'metal_shelf',hardware.x+1.7,0,hardware.z+5.5,Math.PI),
      model(api,scene,'workbench',hardware.x-6.8,0,hardware.z-5.7,0),
      model(api,scene,'tool_cabinet',hardware.x-8.8,0,hardware.z+2.0,Math.PI/2),
      model(api,scene,'office_desk',hardware.x-6.5,FLOOR_HEIGHT,hardware.z-5.2,0),
      model(api,scene,'monitor',hardware.x-6.5,FLOOR_HEIGHT+.98,hardware.z-5.2,0,.9,false),
      model(api,scene,'chair',hardware.x-6.5,FLOOR_HEIGHT,hardware.z-4.1,Math.PI),
      model(api,scene,'filing_cabinet',hardware.x-8.7,FLOOR_HEIGHT,hardware.z+5.8,Math.PI/2),
      model(api,scene,'metal_shelf',hardware.x-2.8,FLOOR_HEIGHT,hardware.z+5.8,Math.PI)
    );
    rug(scene,m,hardware.x-6.5,hardware.z-5.0,5,3.5,FLOOR_HEIGHT,'carpetBlue');
    pictureX(scene,m,hardware.x-hardware.w/2+.2,FLOOR_HEIGHT+1.72,hardware.z-3.0,'pictureB');

    // Row house and pharmacy retain domestic and clinical detail.
    jobs.push(
      model(api,scene,'fridge',rowhouse.x-6.1,0,rowhouse.z+5.7,Math.PI),
      model(api,scene,'wood_table',rowhouse.x-5.3,0,rowhouse.z-3.4,0),
      model(api,scene,'chair',rowhouse.x-6.6,0,rowhouse.z-3.4,Math.PI/2),
      model(api,scene,'hospital_bed',rowhouse.x-5.8,FLOOR_HEIGHT,rowhouse.z-4.2,Math.PI/2),
      model(api,scene,'office_desk',rowhouse.x-5.6,FLOOR_HEIGHT,rowhouse.z+4.2,Math.PI/2),
      model(api,scene,'chair',rowhouse.x-4.5,FLOOR_HEIGHT,rowhouse.z+4.2,-Math.PI/2),
      model(api,scene,'hospital_bed',pharmacy.x-5.4,0,pharmacy.z+3.7,Math.PI/2),
      model(api,scene,'hospital_bed',pharmacy.x-5.4,0,pharmacy.z-1.0,Math.PI/2),
      model(api,scene,'metal_shelf',pharmacy.x+1.0,0,pharmacy.z+4.5,Math.PI),
      model(api,scene,'office_desk',pharmacy.x-5.5,0,pharmacy.z-5.2,0),
      model(api,scene,'cash_register',pharmacy.x-5.5,1.02,pharmacy.z-5.2,0,.9,false)
    );
    rug(scene,m,rowhouse.x-5.2,rowhouse.z-3.4,5.3,3.8,0,'carpetRed');rug(scene,m,rowhouse.x-5.3,rowhouse.z+3.8,4.8,3.8,FLOOR_HEIGHT,'carpetGold');
    pictureZ(scene,m,rowhouse.x-5.4,FLOOR_HEIGHT+1.72,rowhouse.z+rowhouse.d/2-.2,'pictureA');
    return jobs
  }

  async function buildOldTown(scene,api){
    const m=palette(scene,api,'oldtown',{road:'#1d2221',roadEdge:'#3b3c37',wall:'#555b58',wallAlt:'#60554d',interior:'#6b6861',floor:'#343633',roof:'#202423',trim:'#292e2d'});
    road(scene,m,0,0,15,146);road(scene,m,0,-40,132,15);road(scene,m,0,9,132,15);
    roadDashes(scene,m,0,0,142,'z');roadDashes(scene,m,0,-40,128,'x');roadDashes(scene,m,0,9,128,'x');
    roadCracks(scene,m,[[-3,-55,3,.6],[3,-31,2.2,-.4],[-48,-41,3.4,.1],[31,-39,2.6,-.7],[-35,8,3.2,.5],[40,10,2.3,-.1],[2,39,2.8,.7]]);

    const apartment=createBuilding(scene,m,{name:'marrow_apartments',x:-29,z:25,w:24,d:22,stories:3,roof:'flat',frontDoorX:4.2,backDoor:true});
    const hardware=createBuilding(scene,m,{name:'contractor_supply',x:29,z:-22,w:22,d:18,stories:2,roof:'flat',frontDoorX:2.0,backDoor:true});
    const rowhouse=createBuilding(scene,m,{name:'row_house',x:-29,z:-25,w:20,d:17,stories:2,roof:'gable',frontDoorX:3.2,backDoor:true});
    const pharmacy=createBuilding(scene,m,{name:'marrow_pharmacy',x:28,z:30,w:19,d:16,stories:1,roof:'flat',frontDoorX:0,backDoor:true});

    // Fenced contractor yard and a clipped hedge around the apartment courtyard.
    hedgeRun(scene,m,[-43,12],[-43,51]);hedgeRun(scene,m,[-43,51],[-16,51]);hedgeRun(scene,m,[-16,51],[-16,45]);
    fenceRun(scene,m,[18,18],[18,47]);fenceRun(scene,m,[18,47],[39,47]);

    wreckedCar(scene,m,-4,-27,.12,'rust');wreckedCar(scene,m,4,-7,-.33,'wallAlt');wreckedCar(scene,m,-41,-40,Math.PI/2+.16,'metal');
    wreckedCar(scene,m,36,9,Math.PI/2-.14,'rust');wreckedCar(scene,m,5,43,.28,'metal');
    for(const p of[[-9,-54],[9,-27],[-9,-4],[9,25],[-9,52]])streetLamp(scene,m,p[0],p[1]);

    const assets=[];
    assets.push(...furnishOldTown(scene,api,m,apartment,hardware,rowhouse,pharmacy));
    assets.push(
      model(api,scene,'wrecked_pickup',43,0,-40,Math.PI/2+.28),
      model(api,scene,'dumpster',-16,0,20,Math.PI/2),
      model(api,scene,'dumpster',41,0,22,-Math.PI/2),
      model(api,scene,'forklift',43,0,-17,-.25),
      model(api,scene,'pallet',42,0,-10,.1),model(api,scene,'pallet',45,0,-10,-.1),
      model(api,scene,'barrel',44,0,-14,.2),model(api,scene,'barrel',46,0,-14,-.1),
      model(api,scene,'concrete_barrier',-8,0,-58,Math.PI/2),model(api,scene,'concrete_barrier',8,0,-53,Math.PI/2),
      model(api,scene,'road_gate',0,0,56,0),model(api,scene,'warning_sign',6,0,52,Math.PI)
    );
    for(let x=17;x<=42;x+=5)assets.push(model(api,scene,'chainlink_fence',x,0,-7,0));
    for(let z=-32;z<=-12;z+=5)assets.push(model(api,scene,'chainlink_fence',44,0,z,Math.PI/2));
    assets.push(...scatterModels(api,scene,[
      ['dead_tree',-54,0,-50,.2,1.0,false],['dead_tree',-49,0,1,-.2,.9,false],['dead_tree',-52,0,55,.1,1.15,false],
      ['dead_tree',52,0,-53,-.3,1.1,false],['dead_tree',50,0,4,.25,.95,false],['dead_tree',48,0,55,-.1,1.0,false],
      ['bush',-45,0,-18,.2,.9,false],['bush',-47,0,41,-.1,1.0,false],['bush',45,0,32,.1,.9,false],
      ['grass_clump',-13,0,-16,.2,1.0,false],['grass_clump',13,0,-29,-.1,.9,false],['grass_clump',-13,0,37,.2,1.1,false],
      ['grass_clump',14,0,51,-.2,1.0,false],['grass_clump',-55,0,22,.1,.9,false],['grass_clump',54,0,-3,-.1,1.1,false]
    ]));
    await Promise.allSettled(assets);

    await Promise.allSettled([
      api.spawnContainer(scene,'duffel',[apartment.x-7.2,0,apartment.z-7.8],{}),
      api.spawnContainer(scene,'filing',[apartment.x-9.4,0,apartment.z+8.2],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'medical',[apartment.x-7.2,FLOOR_HEIGHT,apartment.z-3.0],{}),
      api.spawnContainer(scene,'filing',[apartment.x-9.3,FLOOR_HEIGHT,apartment.z+7.8],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'duffel',[apartment.x+1.2,FLOOR_HEIGHT,apartment.z+8.0],{}),
      api.spawnContainer(scene,'crate',[apartment.x-8.8,FLOOR_HEIGHT*2,apartment.z+7.8],{}),
      api.spawnContainer(scene,'filing',[apartment.x-9.4,FLOOR_HEIGHT*2,apartment.z-1.0],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'duffel',[apartment.x+1.0,FLOOR_HEIGHT*2,apartment.z-7.5],{}),
      api.spawnContainer(scene,'tools',[hardware.x-8.5,0,hardware.z+6.7],{rotationY:Math.PI}),
      api.spawnContainer(scene,'tools',[hardware.x-4.0,0,hardware.z+6.7],{rotationY:Math.PI}),
      api.spawnContainer(scene,'crate',[hardware.x+1.0,0,hardware.z+6.8],{}),
      api.spawnContainer(scene,'ammo',[hardware.x-8.5,FLOOR_HEIGHT,hardware.z+6.5],{}),
      api.spawnContainer(scene,'filing',[hardware.x-6.5,FLOOR_HEIGHT,hardware.z-6.6],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'duffel',[rowhouse.x-6.4,0,rowhouse.z+5.7],{}),
      api.spawnContainer(scene,'medical',[rowhouse.x-5.8,FLOOR_HEIGHT,rowhouse.z-5.6],{}),
      api.spawnContainer(scene,'filing',[rowhouse.x-6.2,FLOOR_HEIGHT,rowhouse.z+5.5],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'medical',[pharmacy.x-6.7,0,pharmacy.z+5.7],{}),
      api.spawnContainer(scene,'medical',[pharmacy.x-2.0,0,pharmacy.z+5.6],{}),
      api.spawnContainer(scene,'filing',[pharmacy.x-7.1,0,pharmacy.z-5.5],{rotationY:Math.PI/2}),
      api.spawnContainer(scene,'weapon',[43,0,-14],{}),
      api.spawnContainer(scene,'crate',[-16,0,21],{}),
      api.spawnLoose(scene,'ssd',[apartment.x+1.0,FLOOR_HEIGHT+.93,apartment.z-6.5]),
      api.spawnLoose(scene,'keycard',[apartment.x-6.1,FLOOR_HEIGHT*2+.9,apartment.z+4.9]),
      api.spawnLoose(scene,'copper_wire',[hardware.x-2.5,.85,hardware.z+5.5]),
      api.spawnLoose(scene,'morphine',[pharmacy.x-5.4,.82,pharmacy.z-1.0])
    ]);

    api.createEnemy(scene,[-3,0,-31],{tier:2,weapon:'ak74',lootProfile:'military'});
    api.createEnemy(scene,[-45,0,-40],{tier:2,weapon:'sks',lootProfile:'civilian'});
    api.createEnemy(scene,[42,0,-18],{tier:3,weapon:'m4a1',lootProfile:'military'});
    api.createEnemy(scene,[7,0,-3],{tier:2,weapon:'mp5',lootProfile:'civilian'});
    api.createEnemy(scene,[-13,0,18],{tier:2,weapon:'pump12',lootProfile:'civilian'});
    api.createEnemy(scene,[-47,0,46],{tier:3,weapon:'ak74',lootProfile:'military'});
    api.createEnemy(scene,[43,0,35],{tier:2,weapon:'glock17',lootProfile:'civilian'});
    api.createEnemy(scene,[7,0,47],{tier:2,weapon:'sks',lootProfile:'civilian'});
    api.createEnemy(scene,[-6,0,62],{tier:1,weapon:'makarov',lootProfile:'civilian'})
  }

  async function build(scene,id,api){
    if(!scene||!api)throw new Error('World content requires a scene and core helpers');
    if(id==='emberwood')return buildEmberwood(scene,api);
    if(id==='oldtown')return buildOldTown(scene,api);
    throw new Error('Unknown additive map: '+id)
  }

  function stepTraversal(body,scene,verticalSpeed=0){
    const flights=scene?.metadata?.deadhaulStairFlights;
    if(!body||!Array.isArray(flights)||!flights.length||verticalSpeed>.18)return false;
    const p=body.position;let best=null;
    for(const flight of flights){
      const xLimit=Math.max(.4,flight.width/2-.12);
      if(Math.abs(p.x-flight.x)>xLimit||p.z<flight.startZ-.46||p.z>flight.endZ+.46)continue;
      const t=clamp((p.z-flight.startZ)/(flight.endZ-flight.startZ),0,1);
      const targetY=flight.baseY+flight.rise*t+.03,distance=Math.abs(p.y-targetY);
      if(distance>.82||best&&distance>=best.distance)continue;
      best={targetY,distance}
    }
    if(!best)return false;
    p.y=best.targetY;
    return true
  }

  window.DeadhaulWorldContent={maps,build,stepTraversal};
})();
