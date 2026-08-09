import os, math
import numpy as np
import trimesh
from trimesh.transformations import translation_matrix, rotation_matrix, scale_matrix

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.abspath(os.path.join(HERE,'..','assets','models'))
os.makedirs(OUT, exist_ok=True)

# ---------- helpers ----------
def rgba(hexv, a=255):
    h=hexv.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)] + [a]

def colorize(mesh, color):
    mesh.visual.face_colors = np.tile(np.array(rgba(color),dtype=np.uint8), (len(mesh.faces),1))
    return mesh

def box(extents, pos=(0,0,0), color='#777777', name='box'):
    m=trimesh.creation.box(extents=extents)
    m.apply_translation(pos); colorize(m,color); m.metadata['name']=name; return m

def cyl(radius, height, pos=(0,0,0), color='#777777', sections=16, axis='y', name='cyl'):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=sections)
    # cylinder along z by default -> rotate to y
    if axis=='y': m.apply_transform(rotation_matrix(math.pi/2,[1,0,0]))
    elif axis=='x': m.apply_transform(rotation_matrix(math.pi/2,[0,1,0]))
    m.apply_translation(pos); colorize(m,color); m.metadata['name']=name; return m

def sphere(radius, pos=(0,0,0), color='#3f5839', subdivisions=1, name='sphere'):
    m=trimesh.creation.icosphere(subdivisions=subdivisions,radius=radius); m.apply_translation(pos); colorize(m,color); m.metadata['name']=name; return m

def combine_export(name, meshes):
    scene=trimesh.Scene()
    for i,m in enumerate(meshes):
        nm=m.metadata.get('name',f'part_{i}')
        scene.add_geometry(m,node_name=f'{nm}_{i}',geom_name=f'{nm}_{i}')
    data=scene.export(file_type='glb')
    with open(os.path.join(OUT,name+'.glb'),'wb') as f:f.write(data)
    print(name, len(data))

def frame_rect(w,h,depth,thick,color='#303834',z=0):
    return [
        box((thick,h,depth),(-w/2+thick/2,h/2,z),color,'frame_l'),
        box((thick,h,depth),( w/2-thick/2,h/2,z),color,'frame_r'),
        box((w-2*thick,thick,depth),(0,h-thick/2,z),color,'frame_t'),
        box((w-2*thick,thick,depth),(0,thick/2,z),color,'frame_b'),
    ]

# 1 Blast door
meshes=[box((4.8,4.2,.45),(0,2.1,0),'#343b38','door')]
# ribs
for x in (-1.7,-.85,0,.85,1.7): meshes.append(box((.12,3.7,.16),(x,2.1,-.28),'#161b19','rib'))
for y in (.6,2.1,3.6): meshes.append(box((4.3,.12,.16),(0,y,-.28),'#161b19','brace'))
meshes += [cyl(.27,.24,(0,2.1,-.42),'#878a55',sections=12,axis='z',name='wheelhub')]
for a in np.linspace(0,2*math.pi,8,endpoint=False):
    x=.72*math.cos(a); y=2.1+.72*math.sin(a)
    meshes.append(cyl(.05,1.45,(x/2,y-(2.1-y)/2,-.43),'#878a55',sections=8,axis='y',name='wheelspoke'))
combine_export('blast_door',meshes)

# 2 Workbench
meshes=[box((3.6,.18,1.25),(0,1.05,0),'#4e4437','woodtop')]
for x in (-1.55,1.55):
 for z in (-.48,.48): meshes.append(box((.18,2,.18),(x,.05,z),'#2e3431','leg'))
meshes += [box((3.2,.12,.25),(0,.35,.48),'#2e3431','brace'),box((3.2,.08,.9),(0,.25,0),'#373f3a','shelf')]
# vice + tools
meshes += [box((.45,.35,.35),(1.15,1.32,.28),'#5f6b68','vice'),cyl(.05,.8,(-.9,1.35,-.2),'#a5553b',axis='x',name='hammer')]
combine_export('workbench',meshes)

# 3 metal shelf
meshes=[]
for x in (-1.25,1.25):
 for z in (-.45,.45): meshes.append(box((.11,3.6,.11),(x,1.8,z),'#343b38','post'))
for y in (.15,1.25,2.35,3.45): meshes.append(box((2.7,.11,1.05),(0,y,0),'#4b5550','shelf'))
# boxes on shelves
meshes += [box((.7,.5,.55),(-.7,.47,0),'#66513b','box'),box((.8,.35,.6),(.65,1.52,0),'#34413a','toolbox'),box((.5,.6,.5),(-.9,2.7,0),'#5d3430','can')]
combine_export('metal_shelf',meshes)

# 4 storage crate
meshes=[box((1.55,1.05,1.15),(0,.525,0),'#4d5849','crate')]
for x in (-.68,.68): meshes.append(box((.08,.92,1.25),(x,.55,0),'#252c28','strap'))
for z in (-.5,.5): meshes.append(box((1.4,.08,.08),(0,.2,z),'#252c28','rail'))
combine_export('storage_crate',meshes)

# 5 generator
meshes=[]
# frame rails
for x in (-1.1,1.1):
 meshes += [cyl(.045,2.4,(x,.18,-.65),'#191e1c',axis='x',name='frame'),cyl(.045,2.4,(x,.18,.65),'#191e1c',axis='x',name='frame')]
for x in (-1.1,1.1):
 for z in (-.65,.65): meshes.append(cyl(.045,1.3,(x,.78,z),'#191e1c',axis='y',name='framepost'))
meshes += [box((1.7,.95,1.05),(0,.65,0),'#42473d','engine'),box((.55,.65,1.08),(.87,.68,0),'#59604b','tank'),box((.08,.62,.78),(-.89,.75,0),'#202723','panel')]
# wheels
for x in (-.78,.78): meshes.append(cyl(.26,.16,(x,.26,.7),'#171a19',axis='x',name='wheel'))
combine_export('portable_generator',meshes)

# 6 bunker wall module
meshes=[box((6,3.8,.35),(0,1.9,0),'#3e4441','wall')]
for x in (-2.5,0,2.5): meshes.append(box((.18,3.8,.12),(x,1.9,-.24),'#252b29','reinforce'))
meshes += [cyl(.08,5.5,(0,3.25,-.28),'#59615c',axis='x',name='pipe')]
combine_export('bunker_wall',meshes)

# 7 bunker ceiling light
meshes=[box((2.5,.12,.35),(0,.06,0),'#d1d0b4','tube'),box((2.9,.16,.55),(0,.18,0),'#313735','housing')]
combine_export('ceiling_light',meshes)

# 8 warehouse (open front, detailed)
meshes=[]
# floor
meshes.append(box((26,.25,28),(0,.125,0),'#50534f','floor'))
# side/back/front segments
meshes += [box((.45,8,28),(-13,4,0),'#5a5e59','wall_l'),box((.45,8,28),(13,4,0),'#5a5e59','wall_r'),box((26,8,.45),(0,4,14),'#5a5e59','wall_b')]
meshes += [box((7.5,8,.45),(-9.25,4,-14),'#5a5e59','front_l'),box((7.5,8,.45),(9.25,4,-14),'#5a5e59','front_r'),box((11,2,.45),(0,7,-14),'#5a5e59','front_top')]
# roof corrugated-ish strips
meshes.append(box((26.6,.28,28.6),(0,8.1,0),'#343a37','roof'))
for x in np.linspace(-12,12,9): meshes.append(box((.08,7.6,.08),(x,4,0),'#2f3733','column'))
# loading door trim
meshes += frame_rect(10.7,6,.35,.25,'#252b29',z=-14.28)
# windows high on sides
for z in (-8,0,8):
 meshes.append(box((.04,1.4,3.1),(-13.25,5.9,z),'#73908d','window_l'))
 meshes.append(box((.04,1.4,3.1),(13.25,5.9,z),'#73908d','window_r'))
# loading dock
meshes.append(box((11,1.1,4),(0,.55,-16),'#4c504c','dock'))
combine_export('warehouse',meshes)

# 9 gas station building
meshes=[box((12,.25,9),(0,.125,0),'#5a5d58','floor'),box((12,4.4,.35),(0,2.2,4.5),'#676a63','back'),box((.35,4.4,9),(-6,2.2,0),'#676a63','left'),box((.35,4.4,9),(6,2.2,0),'#676a63','right')]
meshes += [box((4.2,4.4,.35),(-3.9,2.2,-4.5),'#676a63','front_l'),box((4.2,4.4,.35),(3.9,2.2,-4.5),'#676a63','front_r'),box((3.8,1.2,.12),(0,3.6,-4.7),'#6d8782','window'),box((2.2,3.2,.18),(0,1.6,-4.72),'#2c3634','door'),box((12.6,.35,9.6),(0,4.5,0),'#303633','roof')]
combine_export('gas_station',meshes)

# 10 gas canopy
meshes=[box((17,.35,10),(0,4.4,0),'#474d49','roof')]
for x in (-6,6):
 for z in (-3.2,3.2): meshes.append(cyl(.18,4.3,(x,2.15,z),'#5c625e',axis='y',name='post'))
# pumps
for x in (-3,3):
 meshes += [box((1.0,1.65,.7),(x,.825,0),'#6e756f','pump'),box((.65,.45,.08),(x,1.2,-.39),'#1d2422','screen')]
combine_export('gas_canopy',meshes)

# 11 chainlink fence section (frame + crossed wires simplified)
meshes=[]
for x in (-2.5,2.5): meshes.append(cyl(.07,2.6,(x,1.3,0),'#69726d',axis='y',name='post'))
meshes += [cyl(.05,5,(0,2.5,0),'#69726d',axis='x',name='rail'),cyl(.05,5,(0,.2,0),'#69726d',axis='x',name='rail')]
# wire diagonal rods
for x in np.linspace(-2.2,2.2,7):
    # approximate diagonal using thin boxes rotated z
    m=box((.025,3.1,.025),(x,1.3,0),'#808984','wire');m.apply_transform(rotation_matrix(math.radians(35),[0,0,1],point=[x,1.3,0]));meshes.append(m)
    m=box((.025,3.1,.025),(x,1.3,.02),'#808984','wire');m.apply_transform(rotation_matrix(math.radians(-35),[0,0,1],point=[x,1.3,.02]));meshes.append(m)
combine_export('chainlink_fence',meshes)

# 12 dumpster
meshes=[box((3.2,1.6,1.8),(0,.8,0),'#3f5747','body'),box((3.45,.18,2.05),(0,1.68,0),'#293a31','lid')]
# sloped lip rails + wheels
for x in (-1.4,1.4):
 for z in (-.75,.75): meshes.append(cyl(.16,.15,(x,.15,z),'#171b19',axis='x',name='wheel'))
for x in (-1.25,0,1.25): meshes.append(box((.08,1.25,.08),(x,.75,-.93),'#2a3b31','rib'))
combine_export('dumpster',meshes)

# 13 pallet
meshes=[]
for z in (-.55,0,.55): meshes.append(box((2.2,.12,.22),(0,.38,z),'#72553c','slat'))
for x in np.linspace(-.95,.95,5): meshes.append(box((.22,.10,1.45),(x,.5,0),'#8a6848','topslat'))
for x in (-.8,0,.8): meshes.append(box((.22,.32,.22),(x,.18,0),'#5f452f','block'))
combine_export('pallet',meshes)

# 14 barrel
meshes=[cyl(.55,1.45,(0,.725,0),'#4f5d57',sections=20,axis='y',name='barrel')]
for y in (.15,.72,1.3): meshes.append(cyl(.57,.08,(0,y,0),'#252b29',sections=20,axis='y',name='ring'))
combine_export('barrel',meshes)

# 15 concrete barrier
meshes=[box((2.6,.7,.7),(0,.35,0),'#747672','base'),box((2.1,.55,.45),(0,.95,0),'#858782','upper')]
combine_export('concrete_barrier',meshes)

# 16 bush
meshes=[]
for pos,r,c in [((0,.45,0),.7,'#3e5538'),((.5,.55,.15),.58,'#4b633f'),((-.45,.5,-.1),.62,'#364d33'),((.05,.85,-.35),.5,'#526943'),((-.1,.95,.3),.45,'#445d39')]: meshes.append(sphere(r,pos,c,1,'leaf'))
meshes.append(cyl(.07,.9,(0,.45,0),'#463927',sections=8,axis='y',name='stem'))
combine_export('bush',meshes)

# 17 dead tree
meshes=[cyl(.22,4.2,(0,2.1,0),'#554437',sections=10,axis='y',name='trunk')]
for x,z,ang in [(.65,0,.65),(-.55,.2,-.7),(.25,-.5,.85)]:
 m=cyl(.10,2.2,(x/2,3.25,z/2),'#554437',sections=8,axis='y',name='branch');m.apply_transform(rotation_matrix(ang,[0,0,1],point=[x/2,3.25,z/2]));meshes.append(m)
combine_export('dead_tree',meshes)

# 18 grass clump
meshes=[]
for i,a in enumerate(np.linspace(0,2*math.pi,14,endpoint=False)):
 x=.25*math.cos(a);z=.25*math.sin(a);h=.55+.35*(i%3)/2
 m=box((.025,h,.07),(x,h/2,z),'#596b45','blade');m.apply_transform(rotation_matrix((i%2-.5)*.2,[0,0,1],point=[x,h/2,z]));meshes.append(m)
combine_export('grass_clump',meshes)

# 19 forklift
meshes=[box((1.8,.6,2.2),(0,.6,0),'#b08a36','body'),box((1.4,1.6,1.4),(0,1.55,.25),'#9a7831','cab')]
# mast / forks
for x in (-.55,.55): meshes.append(box((.12,2.7,.12),(x,1.65,-1.25),'#242b28','mast'))
for x in (-.55,.55): meshes.append(box((.14,.12,2.3),(x,.22,-2.0),'#2b312f','fork'))
# roof and wheels
meshes.append(box((1.6,.12,1.55),(0,2.4,.25),'#252b29','roof'))
for x in (-.8,.8):
 for z in (-.65,.65): meshes.append(cyl(.34,.24,(x,.36,z),'#171a19',axis='x',name='wheel'))
combine_export('forklift',meshes)

# 20 wrecked pickup
meshes=[box((2.1,.65,4.5),(0,.62,0),'#4a5551','chassis'),box((2.0,1.25,1.9),(0,1.5,-.65),'#3e4945','cab'),box((1.8,.15,1.25),(0,2.05,-.7),'#6b807b','windshield'),box((2,.6,1.6),(0,1.0,1.35),'#38423f','bed')]
for x in (-.95,.95):
 for z in (-1.45,1.45): meshes.append(cyl(.42,.28,(x,.45,z),'#171a19',axis='x',name='wheel'))
# missing/tilted hood detail
hood=box((1.8,.16,1.1),(0,1.18,-1.85),'#505b56','hood');hood.apply_transform(rotation_matrix(-.18,[1,0,0],point=[0,1.18,-1.85]));meshes.append(hood)
combine_export('wrecked_pickup',meshes)

# 21 hand truck / dolly
meshes=[box((1.0,.12,.55),(0,.16,-.15),'#46504b','plate'),box((.12,2.3,.12),(-.4,1.15,0),'#46504b','rail'),box((.12,2.3,.12),(.4,1.15,0),'#46504b','rail'),box((.9,.12,.12),(0,2.25,0),'#46504b','handle')]
for x in (-.48,.48): meshes.append(cyl(.2,.12,(x,.22,.2),'#171a19',axis='x',name='wheel'))
combine_export('hand_truck',meshes)

# loot meshes
# medkit
combine_export('loot_medkit',[box((.8,.3,.58),(0,.15,0),'#7b413e','case'),box((.12,.08,.35),(0,.34,0),'#d8d6c3','cross_v'),box((.35,.08,.12),(0,.34,0),'#d8d6c3','cross_h')])
# battery
combine_export('loot_battery',[box((.75,.55,.45),(0,.275,0),'#252b29','battery'),cyl(.07,.08,(-.2,.59,0),'#b85a43',axis='y',name='terminal'),cyl(.07,.08,(.2,.59,0),'#727a75',axis='y',name='terminal')])
# fuel can
combine_export('loot_fuel_can',[box((.6,.85,.35),(0,.425,0),'#5f5637','can'),box((.28,.18,.12),(0,.94,0),'#363c36','handle'),cyl(.08,.2,(.27,.92,0),'#363c36',axis='y',name='cap')])
# tool case
combine_export('loot_tool_case',[box((1.05,.42,.7),(0,.21,0),'#314b3c','case'),box((.38,.18,.12),(0,.52,0),'#222b27','handle'),box((.12,.08,.08),(-.28,.46,-.36),'#9f8d50','latch'),box((.12,.08,.08),(.28,.46,-.36),'#9f8d50','latch')])
# inverter
combine_export('loot_inverter',[box((.95,.72,.62),(0,.36,0),'#3d4654','unit'),box((.55,.18,.05),(0,.45,-.34),'#1f262c','display'),cyl(.08,.08,(-.28,.2,-.36),'#7d8648',axis='z',name='knob'),cyl(.08,.08,(.28,.2,-.36),'#6f4741',axis='z',name='knob')])
# copper wire coil
meshes=[cyl(.34,.11,(0,.3,0),'#a86d44',sections=20,axis='y',name='coil_outer'),cyl(.17,.14,(0,.3,0),'#332a25',sections=20,axis='y',name='coil_inner')]
combine_export('loot_copper_wire',meshes)

# industrial road sign
combine_export('warning_sign',[box((1.6,.85,.08),(0,1.8,0),'#b6973f','sign'),cyl(.06,3.4,(0,.85,0),'#4e5652',axis='y',name='post')])

# manifest
files=sorted(f for f in os.listdir(OUT) if f.endswith('.glb'))
with open(os.path.join(os.path.dirname(OUT),'manifest.json'),'w') as f:
    import json
    json.dump({'version':1,'models':files},f,indent=2)
