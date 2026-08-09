import os, math, json
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.abspath(os.path.join(HERE,'..','assets','models'))
os.makedirs(OUT, exist_ok=True)

def rgba(h,a=255):
    h=h.lstrip('#');return [int(h[i:i+2],16) for i in (0,2,4)]+[a]
def colorize(m,c):
    m.visual.face_colors=np.tile(np.array(rgba(c),dtype=np.uint8),(len(m.faces),1));return m
def box(e,p=(0,0,0),c='#777777',n='box'):
    m=trimesh.creation.box(extents=e);m.apply_translation(p);colorize(m,c);m.metadata['name']=n;return m
def cyl(r,h,p=(0,0,0),c='#777777',sections=16,axis='y',n='cyl'):
    m=trimesh.creation.cylinder(radius=r,height=h,sections=sections)
    if axis=='y':m.apply_transform(rotation_matrix(math.pi/2,[1,0,0]))
    elif axis=='x':m.apply_transform(rotation_matrix(math.pi/2,[0,1,0]))
    m.apply_translation(p);colorize(m,c);m.metadata['name']=n;return m
def export(name,ms):
    sc=trimesh.Scene()
    for i,m in enumerate(ms):
        nm=m.metadata.get('name',f'p{i}');sc.add_geometry(m,node_name=f'{nm}_{i}',geom_name=f'{nm}_{i}')
    data=sc.export(file_type='glb');open(os.path.join(OUT,name+'.glb'),'wb').write(data);print(name,len(data))

def gun(name,length,stock=True,mag=True,optic=False,wood=False,shotgun=False):
    metal='#272d2b'; dark='#171b1a'; accent='#505650'; wc='#6a4a31'
    ms=[]
    # receiver centered around origin, muzzle points -Z so it sits naturally in FPS view
    ms.append(box((.10,.13,length*.42),(0,0,-length*.12),wc if wood else metal,'receiver'))
    ms.append(cyl(.022,length*.52,(0,.015,-length*.52),dark,10,axis='z',n='barrel'))
    ms.append(cyl(.035,.12,(0,.015,-length*.81),dark,10,axis='z',n='muzzle'))
    ms.append(box((.075,.19,.085),(0,-.13,-length*.10),dark,'grip'))
    if stock:
        ms.append(box((.105,.13,length*.28),(0,.01,length*.25),wc if wood else accent,'stock'))
        ms.append(box((.13,.18,.08),(0,-.015,length*.40),dark,'butt'))
    if mag:
        m=box((.095,.22,.13),(0,-.17,-length*.08),dark,'mag');m.apply_transform(rotation_matrix(.15,[1,0,0],point=[0,-.17,-length*.08]));ms.append(m)
    if shotgun:
        ms.append(box((.075,.09,length*.34),(0,-.035,-length*.44),wc if wood else accent,'pump'))
    if optic:
        ms += [box((.075,.055,.12),(0,.105,-length*.14),dark,'optic'),box((.035,.035,.035),(0,.14,-length*.17),'#79968a','lens')]
    export(name,ms)

gun('weapon_makarov',.55,stock=False,mag=True)
gun('weapon_glock17',.62,stock=False,mag=True)
gun('weapon_1911',.64,stock=False,mag=True)
gun('weapon_mp5',.82,stock=True,mag=True)
gun('weapon_ak74',1.02,stock=True,mag=True,wood=True)
gun('weapon_m4a1',.96,stock=True,mag=True,optic=True)
gun('weapon_sks',1.11,stock=True,mag=False,wood=True)
gun('weapon_mosin',1.22,stock=True,mag=False,wood=True)
gun('weapon_pump12',1.05,stock=True,mag=False,wood=True,shotgun=True)
gun('weapon_saiga12',.98,stock=True,mag=True)
gun('weapon_r700',1.16,stock=True,mag=False,optic=True)
gun('weapon_vector',.74,stock=True,mag=True,optic=True)

# Containers
export('duffel_bag',[box((1.05,.55,.48),(0,.30,0),'#3f4d3d','bag'),cyl(.06,.9,(0,.72,0),'#202722',10,axis='x',n='handle')])
export('weapon_crate',[box((1.65,.62,.72),(0,.31,0),'#39483d','body'),box((1.7,.12,.76),(0,.68,0),'#2a342d','lid'),box((.12,.22,.1),(0,.37,-.42),'#b29b52','latch')])
export('medical_case',[box((1.15,.58,.72),(0,.29,0),'#d6d5c8','body'),box((.18,.08,.44),(0,.61,0),'#a13d3d','crossv'),box((.48,.08,.15),(0,.61,0),'#a13d3d','crossh')])
export('tool_cabinet',[box((1.0,1.65,.55),(0,.825,0),'#43534a','cab'),*[box((.86,.12,.5),(0,.25+i*.32,-.03),'#2c3531',f'drawer{i}') for i in range(4)],box((.16,.06,.05),(.28,1.41,-.30),'#b9a55f','lock')])
export('office_desk',[box((1.8,.12,.8),(0,.82,0),'#685944','top'),box((.12,1.5,.12),(-.75,.75,-.28),'#343c39','leg'),box((.12,1.5,.12),(.75,.75,-.28),'#343c39','leg'),box((.12,1.5,.12),(-.75,.75,.28),'#343c39','leg'),box((.12,1.5,.12),(.75,.75,.28),'#343c39','leg')])
export('filing_cabinet',[box((.75,1.55,.65),(0,.775,0),'#505955','cab'),*[box((.62,.06,.04),(0,.28+i*.36,-.345),'#222826',f'handle{i}') for i in range(4)]])
export('hospital_bed',[box((2.05,.16,.82),(0,.72,0),'#d4d5ce','mattress'),box((2.1,.09,.88),(0,.58,0),'#6e7c77','frame'),*[cyl(.055,.62,(x,.29,z),'#555f5b',8,'y','leg') for x in (-.88,.88) for z in (-.30,.30)]])
export('locker_bank',[box((2.2,2.1,.58),(0,1.05,0),'#59625e','body'),*[box((.04,1.85,.04),(x,1.05,-.31),'#2c3330',f'seam{i}') for i,x in enumerate((-0.72,0,.72))]])
export('ammo_can',[box((.62,.38,.28),(0,.19,0),'#48563c','can'),box((.32,.12,.08),(0,.46,0),'#262e28','handle')])
export('cash_register',[box((.65,.3,.55),(0,.15,0),'#383f3d','body'),box((.52,.08,.25),(0,.34,-.08),'#6e756f','keys')])

# Clinic shell
ms=[box((24,.25,24),(0,.125,0),'#555a57','floor'),box((.45,5,24),(-12,2.5,0),'#747a76','wall'),box((.45,5,24),(12,2.5,0),'#747a76','wall'),box((24,5,.45),(0,2.5,12),'#747a76','back'),box((8,5,.45),(-8,2.5,-12),'#747a76','frontL'),box((8,5,.45),(8,2.5,-12),'#747a76','frontR'),box((8,1.2,.45),(0,4.4,-12),'#747a76','frontTop'),box((24,.3,24),(0,5.1,0),'#383e3b','roof')]
# internal cross corridors with openings
ms += [box((.25,3.3,8),(-3.5,1.65,6),'#8a8e89','inner1'),box((.25,3.3,8),(-3.5,1.65,-6),'#8a8e89','inner2'),box((.25,3.3,7),(4,1.65,6.5),'#8a8e89','inner3'),box((.25,3.3,7),(4,1.65,-6.5),'#8a8e89','inner4')]
export('clinic_building',ms)

# Checkpoint assets
export('guard_tower',[box((2.2,.18,2.2),(0,3.2,0),'#5b625e','deck'),*[cyl(.09,3.2,(x,1.6,z),'#414844',8,'y','leg') for x in (-.9,.9) for z in (-.9,.9)],box((2.2,.12,2.2),(0,4.9,0),'#3d4440','roof'),*[cyl(.07,1.7,(x,4.05,z),'#4d5551',8,'y','post') for x in (-.9,.9) for z in (-.9,.9)]])
export('military_tent',[box((6,.18,4),(0,.09,0),'#454e3c','floor'),box((6,.14,4),(0,2.8,0),'#4f5d45','roof'),box((.15,2.8,4),(-3,1.4,0),'#4f5d45','wallL'),box((.15,2.8,4),(3,1.4,0),'#4f5d45','wallR')])
export('sandbag_wall',[*[box((.9,.28,.4),(x,.14+(i%2)*.25,0),'#81745b',f'bag{i}') for i,x in enumerate(np.linspace(-2.2,2.2,6))]])
export('road_gate',[cyl(.08,3.4,(-2.4,1.7,0),'#4d5451',8,'y','post'),box((4.6,.16,.16),(0,2.9,0),'#c5c1a3','arm'),box((.5,.18,.19),(-1.3,2.9,-.02),'#9a3f34','stripe'),box((.5,.18,.19),(.2,2.9,-.02),'#9a3f34','stripe'),box((.5,.18,.19),(1.7,2.9,-.02),'#9a3f34','stripe')])

# common furnishings / salvage
export('wood_table',[box((1.8,.12,.85),(0,.78,0),'#70583f','top'),*[box((.12,1.45,.12),(x,.72,z),'#4c392a','leg') for x in (-.72,.72) for z in (-.30,.30)]])
export('chair',[box((.62,.10,.62),(0,.58,0),'#5a4a37','seat'),box((.62,.78,.10),(0,1.02,.26),'#5a4a37','back'),*[box((.08,.55,.08),(x,.275,z),'#3c342b','leg') for x in (-.24,.24) for z in (-.24,.24)]])
export('cardboard_box',[box((.85,.62,.72),(0,.31,0),'#8a7152','box'),box((.04,.64,.74),(0,.32,0),'#64513d','tape')])
export('fridge',[box((.92,1.85,.72),(0,.925,0),'#c7c9c4','body'),box((.06,.75,.05),(.34,1.22,-.385),'#686e6b','handle')])
export('computer_tower',[box((.42,.85,.76),(0,.425,0),'#262c2b','case'),box((.22,.08,.04),(0,.62,-.40),'#4b6a62','vent')])
export('monitor',[box((.78,.48,.08),(0,.85,0),'#202625','screen'),box((.16,.55,.14),(0,.45,.05),'#343c39','stand'),box((.55,.08,.32),(0,.15,.08),'#343c39','base')])

# item world models
export('loot_water',[cyl(.11,.55,(0,.275,0),'#5a7f8f',12,'y','bottle'),cyl(.07,.08,(0,.59,0),'#d5d1bb',12,'y','cap')])
export('loot_food',[cyl(.15,.27,(0,.135,0),'#69705a',16,'y','can')])
export('loot_bandage',[box((.34,.16,.21),(0,.08,0),'#d7d6c9','pack'),box((.05,.18,.23),(0,.09,0),'#9a4441','stripe')])
export('loot_morphine',[cyl(.035,.33,(0,.165,0),'#c8c8bb',10,'y','syringe')])
export('loot_ssd',[box((.32,.05,.24),(0,.025,0),'#2c3330','ssd'),box((.20,.02,.03),(0,.055,-.12),'#b7a55c','pins')])
export('loot_gpu',[box((.48,.08,.24),(0,.04,0),'#2b3932','pcb'),cyl(.10,.04,(-.13,.1,0),'#202625',12,'y','fan'),cyl(.10,.04,(.13,.1,0),'#202625',12,'y','fan')])
export('loot_keycard',[box((.34,.018,.22),(0,.009,0),'#566d62','card'),box((.08,.02,.08),(.08,.02,0),'#c5bd80','chip')])
export('loot_watch',[cyl(.09,.035,(0,.04,0),'#a59b69',16,'y','face'),box((.07,.02,.36),(0,.01,0),'#3f3428','strap')])

files=sorted(f for f in os.listdir(OUT) if f.endswith('.glb'))
with open(os.path.join(os.path.dirname(OUT),'manifest.json'),'w') as f:json.dump({'version':2,'models':files},f,indent=2)
