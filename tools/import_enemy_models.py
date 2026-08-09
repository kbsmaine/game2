#!/usr/bin/env python3
"""Convert rigged binary Mixamo FBX characters to compact animated DEADHAUL GLBs.

This importer keeps the supplied character mesh/skin/bind skeleton, embeds only
its diffuse textures (JPEG-compressed for the browser), and retargets the
existing DEADHAUL Ch15 animation library by bone name and rest-pose delta.
"""
from __future__ import annotations
import io, json, math, struct, sys, zlib
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation as SciRot

# ---------------- FBX reader ----------------
class Reader:
    def __init__(self,data,version): self.d=data; self.v=version
    def prop(self,off):
        t=chr(self.d[off]); off+=1
        if t=='Y': return struct.unpack_from('<h',self.d,off)[0],off+2
        if t=='C': return bool(self.d[off]),off+1
        if t=='I': return struct.unpack_from('<i',self.d,off)[0],off+4
        if t=='F': return struct.unpack_from('<f',self.d,off)[0],off+4
        if t=='D': return struct.unpack_from('<d',self.d,off)[0],off+8
        if t=='L': return struct.unpack_from('<q',self.d,off)[0],off+8
        if t in 'SR':
            n=struct.unpack_from('<I',self.d,off)[0]; off+=4
            v=self.d[off:off+n]; off+=n
            if t=='S': v=v.decode('utf-8','replace')
            return v,off
        if t in 'fdlibc':
            n,enc,clen=struct.unpack_from('<III',self.d,off); off+=12
            raw=self.d[off:off+clen]; off+=clen
            if enc==1: raw=zlib.decompress(raw)
            fmt={'f':'f','d':'d','l':'q','i':'i','b':'b','c':'B'}[t]
            sz=struct.calcsize('<'+fmt)
            return struct.unpack('<'+fmt*n,raw[:sz*n]) if n else (),off
        raise ValueError(f'unsupported FBX property {t!r}')
    def node(self,off):
        if self.v>=7500: end,nprops,plen=struct.unpack_from('<QQQ',self.d,off); off+=24
        else: end,nprops,plen=struct.unpack_from('<III',self.d,off); off+=12
        nlen=self.d[off]; off+=1
        if end==0:return None,off
        name=self.d[off:off+nlen].decode('utf-8','replace');off+=nlen
        props=[]
        for _ in range(nprops): v,off=self.prop(off);props.append(v)
        kids=[];nullsz=25 if self.v>=7500 else 13
        while off<end-nullsz:
            ch,noff=self.node(off)
            if ch is None:break
            kids.append(ch);off=noff
        return {'name':name,'props':props,'children':kids},end

def parse_fbx(path:Path):
    d=path.read_bytes()
    if not d.startswith(b'Kaydara FBX Binary'):raise ValueError('binary FBX required')
    v=struct.unpack_from('<I',d,23)[0];r=Reader(d,v);off=27;roots=[]
    while off<len(d):
        n,noff=r.node(off)
        if n is None:break
        roots.append(n);off=noff
    return roots

def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n['children'])

def clean(v):
    if isinstance(v,bytes):v=v.decode('utf-8','replace')
    return str(v).split('\x00',1)[0]

def props70(n):
    p=next((c for c in n['children'] if c['name']=='Properties70'),None);out={}
    if not p:return out
    for x in p['children']:
        if x['name']=='P' and len(x['props'])>=5: out[x['props'][0]]=x['props'][4:]
    return out

# ---------------- GLB utilities ----------------
COMP_FLOAT=5126; COMP_USHORT=5123; COMP_UINT=5125
TARGET_ARRAY=34962; TARGET_ELEMENT=34963
TYPE_N={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def read_glb(path:Path):
    b=path.read_bytes();magic,ver,total=struct.unpack_from('<4sII',b,0)
    if magic!=b'glTF' or ver!=2:raise ValueError('bad GLB')
    off=12;js=None;bn=b''
    while off<total:
        ln,typ=struct.unpack_from('<I4s',b,off);off+=8;c=b[off:off+ln];off+=ln
        if typ==b'JSON':js=json.loads(c.decode('utf-8').rstrip(' \x00'))
        elif typ==b'BIN\x00':bn=c
    return js,bn

def read_accessor(js,bn,i):
    a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']]
    n=TYPE_N[a['type']];st=bv.get('byteOffset',0)+a.get('byteOffset',0);stride=bv.get('byteStride',n*{5126:4,5123:2,5125:4}[a['componentType']])
    fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']]
    return [struct.unpack_from('<'+fmt*n,bn,st+k*stride) for k in range(a['count'])]

class GLB:
    def __init__(self): self.bin=bytearray();self.views=[];self.acc=[]
    def align(self):
        while len(self.bin)%4:self.bin.append(0)
    def add_raw(self,raw:bytes,target=None):
        self.align();off=len(self.bin);self.bin.extend(raw);v={'buffer':0,'byteOffset':off,'byteLength':len(raw)}
        if target:v['target']=target
        i=len(self.views);self.views.append(v);return i
    def add_array(self,arr,component,type_name,target=None,minmax=False):
        arr=np.asarray(arr)
        if component==COMP_FLOAT:arr=arr.astype('<f4',copy=False)
        elif component==COMP_USHORT:arr=arr.astype('<u2',copy=False)
        elif component==COMP_UINT:arr=arr.astype('<u4',copy=False)
        bv=self.add_raw(arr.tobytes(order='C'),target)
        a={'bufferView':bv,'byteOffset':0,'componentType':component,'count':int(len(arr)),'type':type_name}
        if minmax and len(arr):
            aa=arr.reshape(len(arr),-1);a['min']=aa.min(0).astype(float).tolist();a['max']=aa.max(0).astype(float).tolist()
        i=len(self.acc);self.acc.append(a);return i
    def add_mat4(self,mats):
        # glTF matrices are serialized column-major.
        arr=np.asarray([np.asarray(m,dtype=np.float32).T.reshape(16) for m in mats],dtype=np.float32)
        return self.add_array(arr,COMP_FLOAT,'MAT4')
    def write(self,path:Path,js):
        self.align();js['buffers']=[{'byteLength':len(self.bin)}];js['bufferViews']=self.views;js['accessors']=self.acc
        raw=json.dumps(js,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);bn=bytes(self.bin);bn+=b'\0'*((-len(bn))%4)
        total=12+8+len(raw)+8+len(bn);out=bytearray(struct.pack('<4sII',b'glTF',2,total));out.extend(struct.pack('<I4s',len(raw),b'JSON'));out.extend(raw);out.extend(struct.pack('<I4s',len(bn),b'BIN\x00'));out.extend(bn);path.write_bytes(out)

# quaternion xyzw helpers
def qmul(a,b):
    ax,ay,az,aw=a;bx,by,bz,bw=b
    return np.array([aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz],float)
def qinv(q):
    q=np.asarray(q,float);d=float(np.dot(q,q));return np.array([-q[0],-q[1],-q[2],q[3]])/(d or 1)
def qnorm(q):
    q=np.asarray(q,float);n=np.linalg.norm(q);return q/(n or 1)
def qeuler_fbx(deg):
    # FBX eEulerXYZ = Rz * Ry * Rx for column vectors; scipy xyz comp gives same local quaternion here.
    return SciRot.from_euler('xyz',np.asarray(deg,float),degrees=True).as_quat()

def local_from_model(n):
    p=props70(n);t=np.array((p.get('Lcl Translation') or [0,0,0])[:3],float)/100
    pre=(p.get('PreRotation') or [0,0,0])[:3];r=(p.get('Lcl Rotation') or [0,0,0])[:3]
    q=qnorm(qmul(qeuler_fbx(pre),qeuler_fbx(r)));s=np.array((p.get('Lcl Scaling') or [1,1,1])[:3],float)
    M=np.eye(4);M[:3,:3]=SciRot.from_quat(q).as_matrix()@np.diag(s);M[:3,3]=t;return M

def decompose(M):
    t=M[:3,3].copy();A=M[:3,:3].copy();s=np.linalg.norm(A,axis=0);s[s<1e-12]=1;R=A/s
    if np.linalg.det(R)<0:s[0]*=-1;R[:,0]*=-1
    q=SciRot.from_matrix(R).as_quat();return t,q,s

def child_value(n,name,default=None):
    c=next((x for x in n['children'] if x['name']==name),None)
    return c['props'][0] if c and c['props'] else default

def layer_info(g,kind):
    n=next((x for x in g['children'] if x['name']==kind),None)
    if not n:return None
    v={c['name']:c['props'][0] if c['props'] else None for c in n['children']}
    return v

def mapped_vec(layer,direct_key,index_key,cp,pv,poly,components,default):
    if not layer:return np.asarray(default,float)
    mapping=layer.get('MappingInformationType','ByPolygonVertex');ref=layer.get('ReferenceInformationType','Direct')
    if isinstance(mapping,(list,tuple)):mapping=mapping[0]
    if isinstance(ref,(list,tuple)):ref=ref[0]
    if mapping in ('ByVertice','ByVertex','ByControlPoint'):raw_i=cp
    elif mapping=='ByPolygon':raw_i=poly
    elif mapping=='AllSame':raw_i=0
    else:raw_i=pv
    direct=layer.get(direct_key) or ()
    if ref=='IndexToDirect':
        inds=layer.get(index_key) or (); di=int(inds[raw_i]) if raw_i<len(inds) else 0
    else:di=raw_i
    st=di*components
    if st+components>len(direct):return np.asarray(default,float)
    return np.asarray(direct[st:st+components],float)

def jpeg_bytes(content:bytes,name='image'):
    try:
        im=Image.open(io.BytesIO(content));
        if im.mode not in ('RGB','L'):im=im.convert('RGB')
        elif im.mode=='L':im=im.convert('RGB')
        # Cap huge Mixamo 4k/8k texture dimensions for browser enemies.
        maxdim=2048
        if max(im.size)>maxdim:
            scale=maxdim/max(im.size);im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
        out=io.BytesIO();im.save(out,'JPEG',quality=82,optimize=True);return out.getvalue(),'image/jpeg'
    except Exception:
        return content,'application/octet-stream'

def convert(fbx_path:Path,out_path:Path,source_anim_glb:Path,label:str):
    roots=parse_fbx(fbx_path);nodes=list(walk(roots))
    objects={n['props'][0]:n for n in nodes if n['name'] in {'Model','Geometry','Deformer','Material','Texture','Video'} and n['props']}
    models={oid:n for oid,n in objects.items() if n['name']=='Model'}; model_name={oid:clean(n['props'][1]) for oid,n in models.items()}
    con=next(n for n in nodes if n['name']=='Connections');connections=[c['props'] for c in con['children'] if c['name']=='C' and len(c['props'])>=3]
    parent_id={}
    for p in connections:
        if p[0]=='OO' and p[1] in models and p[2] in models: parent_id[p[1]]=p[2]
    bone_ids=[oid for oid,n in models.items() if len(n['props'])>2 and n['props'][2]=='LimbNode' and model_name[oid].startswith('mixamorig:')]
    hips_id=next(oid for oid in bone_ids if model_name[oid]=='mixamorig:Hips')
    children=defaultdict(list)
    for oid in bone_ids:
        par=parent_id.get(oid)
        if par in bone_ids:children[par].append(oid)
    order=[]
    def dfs(oid):
        order.append(oid)
        for c in children.get(oid,[]):dfs(c)
    dfs(hips_id)
    # Any unusual detached Mixamo bones are still retained.
    for oid in bone_ids:
        if oid not in order:dfs(oid)
    joint_index={oid:i for i,oid in enumerate(order)};name_to_joint={model_name[oid]:i for i,oid in enumerate(order)}

    # Union bind poses. If an unweighted end bone is omitted, derive it from FBX local model properties.
    G={}
    for pose in [n for n in nodes if n['name']=='Pose']:
        for pn in [c for c in pose['children'] if c['name']=='PoseNode']:
            vals={c['name']:c['props'][0] for c in pn['children'] if c['props']}
            oid=vals.get('Node');flat=vals.get('Matrix')
            if oid in joint_index and flat:
                M=np.array(flat,float).reshape(4,4).T;M[:3,3]/=100;G[oid]=M
    def ensure_global(oid):
        if oid in G:return G[oid]
        L=local_from_model(models[oid]);par=parent_id.get(oid)
        G[oid]=(ensure_global(par)@L) if par in joint_index else L;return G[oid]
    for oid in order:ensure_global(oid)

    glb=GLB();gltf={'asset':{'version':'2.0','generator':'DEADHAUL enemy FBX converter 2.5.9'},'scene':0,'scenes':[{'nodes':[]}], 'nodes':[], 'meshes':[], 'skins':[], 'materials':[], 'textures':[], 'images':[], 'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}], 'animations':[]}
    # bone nodes
    for oid in order:
        par=parent_id.get(oid);L=np.linalg.inv(G[par])@G[oid] if par in joint_index else G[oid];t,q,s=decompose(L)
        gn={'name':model_name[oid],'translation':t.astype(float).tolist(),'rotation':q.astype(float).tolist(),'scale':s.astype(float).tolist()}
        kids=[joint_index[c] for c in children.get(oid,[]) if c in joint_index]
        if kids:gn['children']=kids
        gltf['nodes'].append(gn)
    gltf['scenes'][0]['nodes'].append(joint_index[hips_id])
    ibms=[np.linalg.inv(G[oid]) for oid in order];ibm_acc=glb.add_mat4(ibms)
    skin_index=0;gltf['skins'].append({'name':label+'_Skin','inverseBindMatrices':ibm_acc,'joints':list(range(len(order))),'skeleton':joint_index[hips_id]})

    # Build material slots globally by FBX material id, using only the diffuse texture.
    mat_index={}
    texture_for_material={}
    video_for_texture={}
    for p in connections:
        if p[0]=='OP' and p[1] in objects and objects[p[1]]['name']=='Texture' and p[2] in objects and objects[p[2]]['name']=='Material' and len(p)>3 and p[3]=='DiffuseColor':texture_for_material[p[2]]=p[1]
        if p[0]=='OO' and p[1] in objects and objects[p[1]]['name']=='Video' and p[2] in objects and objects[p[2]]['name']=='Texture':video_for_texture[p[2]]=p[1]
    # material order is determined by mesh attachment below, but create lazily.
    def ensure_material(mid):
        if mid in mat_index:return mat_index[mid]
        mn=objects[mid];name=clean(mn['props'][1]) or f'Material_{len(mat_index)}';m={'name':name,'pbrMetallicRoughness':{'metallicFactor':0.0,'roughnessFactor':0.78},'doubleSided':True}
        tid=texture_for_material.get(mid);vid=video_for_texture.get(tid)
        if vid is not None:
            vn=objects[vid];content=child_value(vn,'Content',b'');fname=child_value(vn,'Filename',name)
            if content:
                raw,mime=jpeg_bytes(content,Path(str(fname)).name);bv=glb.add_raw(raw);ii=len(gltf['images']);gltf['images'].append({'name':Path(str(fname)).stem,'bufferView':bv,'mimeType':mime});ti=len(gltf['textures']);gltf['textures'].append({'sampler':0,'source':ii});m['pbrMetallicRoughness']['baseColorTexture']={'index':ti}
        if 'baseColorTexture' not in m['pbrMetallicRoughness']:
            pv=props70(mn).get('DiffuseColor',[.55,.55,.55]);m['pbrMetallicRoughness']['baseColorFactor']=[float(pv[0]),float(pv[1]),float(pv[2]),1]
        mi=len(gltf['materials']);gltf['materials'].append(m);mat_index[mid]=mi;return mi

    geometry_ids=[oid for oid,n in objects.items() if n['name']=='Geometry' and len(n['props'])>2 and n['props'][2]=='Mesh']
    for gi,gid in enumerate(geometry_ids):
        geom=objects[gid]
        mesh_model=next((p[2] for p in connections if p[0]=='OO' and p[1]==gid and p[2] in models),None)
        # material slots in FBX connection order
        material_ids=[p[1] for p in connections if p[0]=='OO' and p[2]==mesh_model and p[1] in objects and objects[p[1]]['name']=='Material']
        if not material_ids: material_ids=[]
        mat_slots=[ensure_material(mid) for mid in material_ids]
        # skin for geometry and cluster -> bone mapping
        skin_id=next((p[1] for p in connections if p[0]=='OO' and p[2]==gid and p[1] in objects and objects[p[1]]['name']=='Deformer' and len(objects[p[1]]['props'])>2 and objects[p[1]]['props'][2]=='Skin'),None)
        cluster_ids=[p[1] for p in connections if p[0]=='OO' and p[2]==skin_id and p[1] in objects and objects[p[1]]['name']=='Deformer' and len(objects[p[1]]['props'])>2 and objects[p[1]]['props'][2]=='Cluster']
        cluster_bone={cid:next((p[1] for p in connections if p[0]=='OO' and p[2]==cid and p[1] in joint_index),None) for cid in cluster_ids}
        cp_weights=defaultdict(list)
        for cid,bid in cluster_bone.items():
            if bid is None:continue
            c=objects[cid];inds=child_value(c,'Indexes',());ws=child_value(c,'Weights',())
            for cp,w in zip(inds,ws):cp_weights[int(cp)].append((joint_index[bid],float(w)))
        def skin4(cp):
            a=sorted(cp_weights.get(int(cp),[]),key=lambda x:x[1],reverse=True)[:4]
            if not a:return [joint_index[hips_id],0,0,0],[1,0,0,0]
            total=sum(x[1] for x in a) or 1.0;j=[x[0] for x in a];w=[x[1]/total for x in a]
            while len(j)<4:j.append(0);w.append(0.0)
            return j,w
        V=np.array(child_value(geom,'Vertices',()),dtype=np.float32).reshape(-1,3)/100.0
        pvi=child_value(geom,'PolygonVertexIndex',())
        norm=layer_info(geom,'LayerElementNormal');uv=layer_info(geom,'LayerElementUV');ml=layer_info(geom,'LayerElementMaterial')
        # layer_info values store strings directly here, arrays as tuple.
        positions=[];normals=[];uvs=[];joints=[];weights=[];prim_indices=defaultdict(list)
        poly=[];poly_no=0
        def polygon_material(poly_idx):
            if not ml:return 0
            mapping=ml.get('MappingInformationType','ByPolygon');ref=ml.get('ReferenceInformationType','IndexToDirect');mats=ml.get('Materials') or (0,)
            raw_i=0 if mapping=='AllSame' else poly_idx
            if raw_i>=len(mats):return 0
            return int(mats[raw_i])
        for pv,raw in enumerate(pvi):
            end=raw<0;cp=(-int(raw)-1) if end else int(raw);eidx=len(positions)
            positions.append(V[cp]);normals.append(mapped_vec(norm,'Normals','NormalsIndex',cp,pv,poly_no,3,[0,1,0]));u=mapped_vec(uv,'UV','UVIndex',cp,pv,poly_no,2,[0,0]);uvs.append([u[0],1-u[1]])
            j,w=skin4(cp);joints.append(j);weights.append(w);poly.append(eidx)
            if end:
                slot=polygon_material(poly_no);slot=max(0,min(slot,max(0,len(mat_slots)-1))) if mat_slots else 0
                for k in range(1,len(poly)-1):prim_indices[slot].extend([poly[0],poly[k],poly[k+1]])
                poly=[];poly_no+=1
        pos_acc=glb.add_array(np.asarray(positions,np.float32),COMP_FLOAT,'VEC3',TARGET_ARRAY,True);nor_acc=glb.add_array(np.asarray(normals,np.float32),COMP_FLOAT,'VEC3',TARGET_ARRAY);uv_acc=glb.add_array(np.asarray(uvs,np.float32),COMP_FLOAT,'VEC2',TARGET_ARRAY);j_acc=glb.add_array(np.asarray(joints,np.uint16),COMP_USHORT,'VEC4',TARGET_ARRAY);w_acc=glb.add_array(np.asarray(weights,np.float32),COMP_FLOAT,'VEC4',TARGET_ARRAY)
        prims=[]
        for slot,inds in sorted(prim_indices.items()):
            ia=glb.add_array(np.asarray(inds,np.uint32),COMP_UINT,'SCALAR',TARGET_ELEMENT)
            pr={'attributes':{'POSITION':pos_acc,'NORMAL':nor_acc,'TEXCOORD_0':uv_acc,'JOINTS_0':j_acc,'WEIGHTS_0':w_acc},'indices':ia}
            if mat_slots:pr['material']=mat_slots[min(slot,len(mat_slots)-1)]
            prims.append(pr)
        mesh_name=clean(models[mesh_model]['props'][1]) if mesh_model in models else f'{label}_{gi}'
        mesh_i=len(gltf['meshes']);gltf['meshes'].append({'name':mesh_name,'primitives':prims});node_i=len(gltf['nodes']);gltf['nodes'].append({'name':mesh_name+'_Skinned','mesh':mesh_i,'skin':skin_index});gltf['scenes'][0]['nodes'].append(node_i)

    # Retarget all DEADHAUL Ch15 authored clips relative to bind pose.
    src_js,src_bn=read_glb(source_anim_glb);src_nodes={n.get('name'):n for n in src_js.get('nodes',[])};target_index={n.get('name'):i for i,n in enumerate(gltf['nodes'])}
    target_bind={model_name[oid]:decompose(np.linalg.inv(G[parent_id[oid]])@G[oid] if parent_id.get(oid) in joint_index else G[oid]) for oid in order}
    src_h=float(src_nodes.get('mixamorig:Hips',{}).get('translation',[0,1,0])[1] or 1);tgt_h=float(target_bind['mixamorig:Hips'][0][1] or src_h);height_scale=tgt_h/src_h if abs(src_h)>1e-6 else 1
    for anim in src_js.get('animations',[]):
        na={'name':anim.get('name','clip'),'samplers':[],'channels':[]}
        # Preserve each source sampler independently, remapping its values if needed.
        for ch in anim.get('channels',[]):
            src_sampler=anim['samplers'][ch['sampler']];src_name=src_js['nodes'][ch['target']['node']].get('name');path=ch['target']['path']
            if src_name not in target_index:continue
            times=[r[0] for r in read_accessor(src_js,src_bn,src_sampler['input'])];vals=[tuple(r) for r in read_accessor(src_js,src_bn,src_sampler['output'])]
            if path=='rotation' and src_name in target_bind:
                sb=np.asarray(src_nodes.get(src_name,{}).get('rotation',[0,0,0,1]),float);tb=np.asarray(target_bind[src_name][1],float);delta0=qinv(sb);vals=[qnorm(qmul(tb,qmul(delta0,np.asarray(v,float)))).tolist() for v in vals]
            elif path=='translation' and src_name in target_bind:
                sb=np.asarray(src_nodes.get(src_name,{}).get('translation',[0,0,0]),float);tb=np.asarray(target_bind[src_name][0],float);vals=[(tb+(np.asarray(v,float)-sb)*height_scale).tolist() for v in vals]
            tin=glb.add_array(np.asarray(times,np.float32).reshape(-1,1),COMP_FLOAT,'SCALAR',minmax=True);kind={'rotation':'VEC4','translation':'VEC3','scale':'VEC3'}[path];tout=glb.add_array(np.asarray(vals,np.float32),COMP_FLOAT,kind)
            si=len(na['samplers']);na['samplers'].append({'input':tin,'output':tout,'interpolation':src_sampler.get('interpolation','LINEAR')});na['channels'].append({'sampler':si,'target':{'node':target_index[src_name],'path':path}})
        if na['channels']:gltf['animations'].append(na)
    gltf['asset']['extras']={'source':fbx_path.name,'deadhaulEnemyRig':True,'retargetSource':source_anim_glb.name,'heightScale':height_scale}
    glb.write(out_path,gltf)
    print(f'{fbx_path.name} -> {out_path.name}: bones={len(order)} meshes={len(gltf["meshes"])} materials={len(gltf["materials"])} animations={len(gltf["animations"])} size={out_path.stat().st_size/1048576:.2f} MB')

if __name__=='__main__':
    if len(sys.argv)!=6:
        print('usage: import_enemy_models.py source_anim.glb Ch18.fbx Ch35.fbx Swat.fbx out_dir');sys.exit(2)
    src=Path(sys.argv[1]);out=Path(sys.argv[5]);out.mkdir(parents=True,exist_ok=True)
    convert(Path(sys.argv[2]),out/'enemy_ch18.glb',src,'Ch18 Raider')
    convert(Path(sys.argv[3]),out/'enemy_ch35.glb',src,'Ch35 Raider')
    convert(Path(sys.argv[4]),out/'enemy_swat.glb',src,'SWAT Raider')
