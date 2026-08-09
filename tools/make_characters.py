import os, json, math, struct
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'assets','models')
os.makedirs(OUT,exist_ok=True)

# -------- tiny GLB writer for rigid-weight skinned meshes --------
COMPONENT_FLOAT=5126; COMPONENT_USHORT=5123; COMPONENT_UINT=5125
TARGET_ARRAY=34962; TARGET_ELEMENT=34963

def pad4(b:bytes,pad=b'\x00'):
    return b + pad*((4-len(b)%4)%4)

def quat_from_euler(rx=0,ry=0,rz=0):
    # XYZ intrinsic
    cx,sx=math.cos(rx/2),math.sin(rx/2); cy,sy=math.cos(ry/2),math.sin(ry/2); cz,sz=math.cos(rz/2),math.sin(rz/2)
    return [sx*cy*cz+cx*sy*sz, cx*sy*cz-sx*cy*sz, cx*cy*sz+sx*sy*cz, cx*cy*cz-sx*sy*sz]

def matrix_from_tr(t,q=None):
    M=np.eye(4,dtype=np.float32)
    if q:
        x,y,z,w=q; xx=x*x; yy=y*y; zz=z*z; xy=x*y; xz=x*z; yz=y*z; wx=w*x; wy=w*y; wz=w*z
        M[:3,:3]=np.array([[1-2*(yy+zz),2*(xy-wz),2*(xz+wy)],[2*(xy+wz),1-2*(xx+zz),2*(yz-wx)],[2*(xz-wy),2*(yz+wx),1-2*(xx+yy)]],dtype=np.float32)
    M[:3,3]=t
    return M

def rgba(hexv):
    h=hexv.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]+[1.0]

def make_box(extents,center):
    m=trimesh.creation.box(extents=extents); m.apply_translation(center); return m

def make_cyl(radius,height,center,axis='y',sections=10):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=sections)
    if axis=='y': m.apply_transform(rotation_matrix(math.pi/2,[1,0,0]))
    elif axis=='x': m.apply_transform(rotation_matrix(math.pi/2,[0,1,0]))
    m.apply_translation(center); return m

def make_uv_sphere(radius,center,subdiv=1):
    m=trimesh.creation.icosphere(subdivisions=subdiv,radius=radius); m.apply_translation(center); return m

def mesh_between(a,b,r=.08,sections=10):
    a=np.array(a,float); b=np.array(b,float); v=b-a; L=np.linalg.norm(v); mid=(a+b)/2
    m=trimesh.creation.cylinder(radius=r,height=L,sections=sections)
    # default cylinder z axis; rotate z -> vector
    if L>1e-6:
        z=np.array([0.,0.,1.]); d=v/L; axis=np.cross(z,d); dot=np.clip(np.dot(z,d),-1,1)
        if np.linalg.norm(axis)>1e-6:
            axis=axis/np.linalg.norm(axis); m.apply_transform(rotation_matrix(math.acos(dot),axis))
        elif dot<0: m.apply_transform(rotation_matrix(math.pi,[1,0,0]))
    m.apply_translation(mid); return m

class GLB:
    def __init__(self):
        self.bin=bytearray(); self.bufferViews=[]; self.accessors=[]
    def add_data(self,arr,target=None,component=None,type_name=None,minmax=False):
        arr=np.asarray(arr)
        raw=arr.tobytes(order='C')
        while len(self.bin)%4:self.bin.extend(b'\x00')
        off=len(self.bin); self.bin.extend(raw)
        bv={'buffer':0,'byteOffset':off,'byteLength':len(raw)}
        if target: bv['target']=target
        bvi=len(self.bufferViews); self.bufferViews.append(bv)
        if component is None:
            component={np.dtype('float32'):COMPONENT_FLOAT,np.dtype('uint16'):COMPONENT_USHORT,np.dtype('uint32'):COMPONENT_UINT}[arr.dtype]
        if type_name is None:
            type_name={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[arr.shape[1] if arr.ndim>1 else 1]
        acc={'bufferView':bvi,'componentType':component,'count':int(arr.shape[0]),'type':type_name}
        if minmax and arr.ndim==2:
            acc['min']=arr.min(0).astype(float).tolist(); acc['max']=arr.max(0).astype(float).tolist()
        ai=len(self.accessors); self.accessors.append(acc); return ai
    def write(self,path,gltf):
        gltf['buffers']=[{'byteLength':len(self.bin)}]; gltf['bufferViews']=self.bufferViews; gltf['accessors']=self.accessors
        js=pad4(json.dumps(gltf,separators=(',',':')).encode('utf-8'),b' '); bn=pad4(bytes(self.bin))
        total=12+8+len(js)+8+len(bn)
        out=bytearray(struct.pack('<4sII',b'glTF',2,total)); out.extend(struct.pack('<I4s',len(js),b'JSON')); out.extend(js); out.extend(struct.pack('<I4s',len(bn),b'BIN\x00')); out.extend(bn)
        open(path,'wb').write(out)

# Skeleton local translations; bind pose is slightly weapon-ready.
WORLD_BONES=[
 ('Hips',None,[0,.96,0],[0,0,0,1]),
 ('Spine','Hips',[0,.27,0],[0,0,0,1]),('Chest','Spine',[0,.31,0],[0,0,0,1]),('Neck','Chest',[0,.26,0],[0,0,0,1]),('Head','Neck',[0,.21,0],[0,0,0,1]),
 ('UpperArm_L','Chest',[-.28,.16,.02],quat_from_euler(-.42,0,.10)),('LowerArm_L','UpperArm_L',[-.30,-.12,.16],quat_from_euler(-.36,0,-.10)),('Hand_L','LowerArm_L',[-.24,-.04,.17],[0,0,0,1]),
 ('UpperArm_R','Chest',[.28,.16,.02],quat_from_euler(-.48,0,-.10)),('LowerArm_R','UpperArm_R',[.30,-.12,.16],quat_from_euler(-.34,0,.10)),('Hand_R','LowerArm_R',[.24,-.04,.17],[0,0,0,1]),
 ('UpperLeg_L','Hips',[-.15,-.11,0],[0,0,0,1]),('LowerLeg_L','UpperLeg_L',[0,-.46,.015],[0,0,0,1]),('Foot_L','LowerLeg_L',[0,-.43,.07],[0,0,0,1]),
 ('UpperLeg_R','Hips',[.15,-.11,0],[0,0,0,1]),('LowerLeg_R','UpperLeg_R',[0,-.46,.015],[0,0,0,1]),('Foot_R','LowerLeg_R',[0,-.43,.07],[0,0,0,1]),
]
FP_BONES=[
 ('FP_Root',None,[0,0,0],[0,0,0,1]),
 ('UpperArm_L','FP_Root',[-.21,-.18,.18],quat_from_euler(-.15,0,.12)),('LowerArm_L','UpperArm_L',[-.12,-.02,.29],quat_from_euler(-.05,.05,.04)),('Hand_L','LowerArm_L',[-.04,.01,.25],[0,0,0,1]),
 ('UpperArm_R','FP_Root',[.18,-.20,.16],quat_from_euler(-.10,0,-.10)),('LowerArm_R','UpperArm_R',[.10,-.015,.25],quat_from_euler(-.06,-.04,-.04)),('Hand_R','LowerArm_R',[.03,.00,.22],[0,0,0,1]),
]

def bone_globals(bones):
    idx={n:i for i,(n,_,_,_) in enumerate(bones)}; mats=[]
    for n,p,t,q in bones:
        L=matrix_from_tr(np.array(t,np.float32),q)
        mats.append((mats[idx[p]]@L) if p else L)
    return idx,mats

def character_parts(bones,variant='player1'):
    idx,G=bone_globals(bones); gp={n:G[i][:3,3] for n,i in idx.items()}
    if bones is FP_BONES:
        skin='#b8896f'; glove='#232b28'; sleeve='#3a493f'
        parts=[]
        for side in ['L','R']:
            ua,la,hand=gp[f'UpperArm_{side}'],gp[f'LowerArm_{side}'],gp[f'Hand_{side}']
            parts += [(f'UpperArm_{side}',mesh_between(ua,la,.085),sleeve),(f'LowerArm_{side}',mesh_between(la,hand,.075),sleeve),(f'Hand_{side}',make_uv_sphere(.085,hand,1),glove)]
        return parts
    palettes={
      'player1':('#465148','#252c29','#b8896f','#26332d','#536359'),
      'player2':('#38464c','#20282c','#9b735e','#28353b','#465960'),
      'player3':('#554940','#2b2724','#c29374','#302e2a','#675a4c'),
      'raider1':('#4c5542','#252a26','#9a745f','#303a30','#596247'),
      'raider2':('#4b4038','#282624','#7f5f50','#35302a','#665043'),
      'raider3':('#343d43','#20262a','#a47a63','#252f35','#495862')}
    jacket,pants,skin,gear,accent=palettes[variant]
    p=[]
    hips,spine,chest,neck,head=[gp[x] for x in ['Hips','Spine','Chest','Neck','Head']]
    p.append(('Hips',make_box((.42,.30,.30),hips+np.array([0,.03,0])),pants))
    p.append(('Spine',make_box((.48,.36,.30),(spine+chest)/2),jacket))
    p.append(('Chest',make_box((.58,.40,.34),chest+np.array([0,.03,0])),jacket))
    p.append(('Chest',make_box((.62,.30,.05),chest+np.array([0,.03,-.19])),gear))
    p.append(('Neck',make_cyl(.075,.14,neck,axis='y'),skin))
    p.append(('Head',make_uv_sphere(.19,head+np.array([0,.09,0]),1),skin))
    # face/helmet accessories
    if 'raider' in variant:
        p.append(('Head',make_box((.32,.16,.05),head+np.array([0,.09,-.18])),accent))
        if variant=='raider3':p.append(('Head',make_box((.38,.12,.35),head+np.array([0,.23,0])),gear))
    else:
        p.append(('Head',make_box((.36,.11,.33),head+np.array([0,.24,0])),gear))
    for side,sgn in [('L',-1),('R',1)]:
        ua,la,hand=gp[f'UpperArm_{side}'],gp[f'LowerArm_{side}'],gp[f'Hand_{side}']
        p.append((f'UpperArm_{side}',mesh_between(ua,la,.095),jacket));p.append((f'LowerArm_{side}',mesh_between(la,hand,.085),jacket));p.append((f'Hand_{side}',make_uv_sphere(.09,hand,1),skin))
        ul,ll,foot=gp[f'UpperLeg_{side}'],gp[f'LowerLeg_{side}'],gp[f'Foot_{side}']
        p.append((f'UpperLeg_{side}',mesh_between(ul,ll,.115),pants));p.append((f'LowerLeg_{side}',mesh_between(ll,foot,.105),pants));p.append((f'Foot_{side}',make_box((.20,.15,.34),foot+np.array([0,-.04,.09])),gear))
    # backpack/gear adds silhouette variety but follows chest
    if variant in ('player1','player2','player3','raider2','raider3'):
        p.append(('Chest',make_box((.44,.50,.18),chest+np.array([0,-.02,.24])),gear))
    return p

def build_rigged_glb(filename,bones,variant):
    writer=GLB(); idx,G=bone_globals(bones)
    # Node list starts with bone nodes, then mesh nodes.
    nodes=[]
    for i,(name,parent,t,q) in enumerate(bones):
        node={'name':name,'translation':[float(x) for x in t]}
        if q!=[0,0,0,1]:node['rotation']=[float(x) for x in q]
        children=[j for j,(_,p,_,_) in enumerate(bones) if p==name]
        if children:node['children']=children
        nodes.append(node)
    # inverse bind matrices, column-major floats expected by glTF
    inv=[]
    for M in G:
        inv.append(np.linalg.inv(M).astype(np.float32).T.reshape(-1))
    ibm=writer.add_data(np.asarray(inv,dtype=np.float32),type_name='MAT4')
    materials=[]; mat_index={}
    def material(c):
        if c in mat_index:return mat_index[c]
        i=len(materials);mat_index[c]=i;materials.append({'name':'mat_'+c[1:],'pbrMetallicRoughness':{'baseColorFactor':rgba(c),'metallicFactor':0.0,'roughnessFactor':.86}});return i
    meshes=[]
    for pi,(bone_name,mesh,color) in enumerate(character_parts(bones,variant)):
        v=np.asarray(mesh.vertices,dtype=np.float32); n=np.asarray(mesh.vertex_normals,dtype=np.float32); f=np.asarray(mesh.faces.reshape(-1),dtype=np.uint32)
        ji=idx[bone_name]; joints=np.zeros((len(v),4),dtype=np.uint16);joints[:,0]=ji;weights=np.zeros((len(v),4),dtype=np.float32);weights[:,0]=1
        attrs={'POSITION':writer.add_data(v,TARGET_ARRAY,minmax=True),'NORMAL':writer.add_data(n,TARGET_ARRAY),'JOINTS_0':writer.add_data(joints,TARGET_ARRAY),'WEIGHTS_0':writer.add_data(weights,TARGET_ARRAY)}
        ind=writer.add_data(f,TARGET_ELEMENT)
        mi=len(meshes);meshes.append({'name':'mesh_'+bone_name+'_'+str(pi),'primitives':[{'attributes':attrs,'indices':ind,'material':material(color)}]})
        nodes.append({'name':'mesh_'+bone_name+'_'+str(pi),'mesh':mi,'skin':0})
    scene_nodes=list(range(len(bones),len(nodes)))+[i for i,(_,p,_,_) in enumerate(bones) if p is None]
    gltf={'asset':{'version':'2.0','generator':'DEADHAUL Character Rig Generator'},'scene':0,'scenes':[{'nodes':scene_nodes}], 'nodes':nodes,'meshes':meshes,'skins':[{'name':'DEADHAUL_Rig','joints':list(range(len(bones))),'skeleton':0,'inverseBindMatrices':ibm}],'materials':materials}
    path=os.path.join(OUT,filename+'.glb');writer.write(path,gltf);print(filename,os.path.getsize(path))

for name,var in [('player_01','player1'),('player_02','player2'),('player_03','player3'),('raider_01','raider1'),('raider_02','raider2'),('raider_03','raider3')]:build_rigged_glb(name,WORLD_BONES,var)
build_rigged_glb('fp_arms',FP_BONES,'fp')

# refresh manifest
models=sorted(f for f in os.listdir(OUT) if f.endswith('.glb'))
with open(os.path.join(ROOT,'assets','manifest.json'),'w') as f:json.dump({'version':3,'models':models},f,indent=2)

def export_simple(name, parts):
    sc=trimesh.Scene()
    for i,(mesh,color,namepart) in enumerate(parts):
        mesh.visual.face_colors=np.tile(np.array([int(color[j:j+2],16) for j in (1,3,5)]+[255],dtype=np.uint8),(len(mesh.faces),1))
        sc.add_geometry(mesh,node_name=f'{namepart}_{i}',geom_name=f'{namepart}_{i}')
    open(os.path.join(OUT,name+'.glb'),'wb').write(sc.export(file_type='glb'))

export_simple('gear_helmet',[(make_uv_sphere(.22,[0,0,0],1),'#39433f','helmet'),(make_box((.36,.07,.10),[0,.11,-.16]),'#242a28','brow')])
export_simple('gear_soft_armor',[(make_box((.60,.62,.12),[0,0,0]),'#303a35','front'),(make_box((.54,.56,.10),[0,0,.22]),'#303a35','back')])
export_simple('gear_plate_carrier',[(make_box((.64,.68,.16),[0,0,0]),'#2b342f','front'),(make_box((.58,.60,.13),[0,0,.27]),'#2b342f','back'),(make_box((.18,.16,.08),[-.18,-.12,-.13]),'#4a554d','pouch'),(make_box((.18,.16,.08),[.05,-.12,-.13]),'#4a554d','pouch')])
export_simple('gear_chest_rig',[(make_box((.58,.26,.08),[0,0,0]),'#4a5547','strap'),*[ (make_box((.15,.22,.10),[x,-.12,-.08]),'#38423a','pouch') for x in (-.18,0,.18)]])
export_simple('gear_scav_pack',[(make_box((.44,.55,.22),[0,0,0]),'#46513f','pack'),(make_box((.34,.18,.10),[0,-.28,-.05]),'#313a32','pocket')])
export_simple('gear_patrol_pack',[(make_box((.50,.70,.28),[0,0,0]),'#39473e','pack'),(make_box((.42,.22,.13),[0,-.36,-.05]),'#27312b','pocket'),(make_box((.12,.50,.08),[-.29,0,0]),'#526057','side'),(make_box((.12,.50,.08),[.29,0,0]),'#526057','side')])
models=sorted(f for f in os.listdir(OUT) if f.endswith('.glb'))
with open(os.path.join(ROOT,'assets','manifest.json'),'w') as f:json.dump({'version':3,'models':models},f,indent=2)
