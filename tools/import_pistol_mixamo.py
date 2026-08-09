#!/usr/bin/env python3
"""Inject two Mixamo pistol locomotion FBXs into DEADHAUL Ch15 GLBs.

Usage:
  python tools/import_pistol_mixamo.py <pistol_run.fbx> <pistol_fast.fbx> <assets/models/player_ch15.glb> [...]

The script is intentionally self-contained: it parses the subset of binary FBX
used by Mixamo motion exports and appends glTF animation clips to existing GLBs.
"""
from __future__ import annotations
import bisect, json, math, struct, sys, zlib
from pathlib import Path

FBX_TICKS_PER_SECOND = 46186158000.0

# ---------------- FBX binary reader ----------------
class FbxReader:
    def __init__(self, data: bytes, version: int):
        self.data=data; self.version=version
    def prop(self, off):
        d=self.data; t=chr(d[off]); off+=1
        if t=='Y': return struct.unpack_from('<h',d,off)[0],off+2
        if t=='C': return bool(d[off]),off+1
        if t=='I': return struct.unpack_from('<i',d,off)[0],off+4
        if t=='F': return struct.unpack_from('<f',d,off)[0],off+4
        if t=='D': return struct.unpack_from('<d',d,off)[0],off+8
        if t=='L': return struct.unpack_from('<q',d,off)[0],off+8
        if t in 'SR':
            n=struct.unpack_from('<I',d,off)[0];off+=4
            raw=d[off:off+n];off+=n
            return (raw.decode('utf-8','replace') if t=='S' else raw),off
        if t in 'fdlibc':
            n,enc,clen=struct.unpack_from('<III',d,off);off+=12
            raw=d[off:off+clen];off+=clen
            if enc==1: raw=zlib.decompress(raw)
            fmt={'f':'f','d':'d','l':'q','i':'i','b':'b','c':'B'}[t]
            return struct.unpack('<'+fmt*n,raw),off
        raise ValueError(f'Unsupported FBX property type {t!r}')
    def node(self,off):
        d=self.data
        if self.version>=7500:
            end,nprops,_=struct.unpack_from('<QQQ',d,off);off+=24;null_size=25
        else:
            end,nprops,_=struct.unpack_from('<III',d,off);off+=12;null_size=13
        nlen=d[off];off+=1
        if end==0:return None,off
        name=d[off:off+nlen].decode('utf-8','replace');off+=nlen
        props=[]
        for _ in range(nprops):
            v,off=self.prop(off);props.append(v)
        children=[]
        while off<end-null_size:
            ch,_off=self.node(off)
            if ch is None:break
            children.append(ch);off=_off
        return {'name':name,'props':props,'children':children},end

def parse_fbx(path: Path):
    d=path.read_bytes()
    if not d.startswith(b'Kaydara FBX Binary'):
        raise ValueError(f'{path} is not a binary FBX')
    version=struct.unpack_from('<I',d,23)[0]
    r=FbxReader(d,version);off=27;roots=[]
    while off<len(d):
        n,noff=r.node(off)
        if n is None:break
        roots.append(n);off=noff
    return roots

def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n['children'])

def clean_name(v): return str(v).split('\x00',1)[0]

def properties70(model):
    out={}
    for ch in model['children']:
        if ch['name']!='Properties70':continue
        for p in ch['children']:
            if p['name']=='P' and p['props']:
                out[p['props'][0]]=p['props'][4:]
    return out

def qmul(a,b):
    x1,y1,z1,w1=a;x2,y2,z2,w2=b
    return (
        w1*x2+x1*w2+y1*z2-z1*y2,
        w1*y2-x1*z2+y1*w2+z1*x2,
        w1*z2+x1*y2-y1*x2+z1*w2,
        w1*w2-x1*x2-y1*y2-z1*z2,
    )

def qnorm(q):
    n=math.sqrt(sum(v*v for v in q)) or 1.0
    return tuple(v/n for v in q)

def qaxis(axis,deg):
    h=math.radians(deg)*0.5;s=math.sin(h);c=math.cos(h)
    if axis=='X':return(s,0,0,c)
    if axis=='Y':return(0,s,0,c)
    return(0,0,s,c)

def q_euler_fbx_xyz(e):
    # FBX's eEulerXYZ local matrix is Rz * Ry * Rx for column vectors.
    x,y,z=e
    return qnorm(qmul(qaxis('Z',z),qmul(qaxis('Y',y),qaxis('X',x))))

def curve_values(node):
    props={c['name']:c['props'] for c in node['children']}
    times=list(props.get('KeyTime',[()])[0]) if props.get('KeyTime') else []
    vals=list(props.get('KeyValueFloat',[()])[0]) if props.get('KeyValueFloat') else []
    return times,vals

def eval_curve(times,vals,t,default=0.0):
    if not times or not vals:return default
    if len(times)==1:return float(vals[0])
    if t<=times[0]:return float(vals[0])
    if t>=times[-1]:return float(vals[-1])
    i=bisect.bisect_right(times,t)-1
    t0,t1=times[i],times[i+1];v0,v1=float(vals[i]),float(vals[i+1])
    u=(t-t0)/(t1-t0) if t1!=t0 else 0.0
    return v0+(v1-v0)*u

def extract_mixamo_motion(path: Path):
    nodes=list(walk(parse_fbx(path)))
    typed={}
    for n in nodes:
        if n['name'] in {'Model','AnimationCurveNode','AnimationCurve','AnimationLayer','AnimationStack'} and n.get('props') and isinstance(n['props'][0],int):
            typed[n['props'][0]]=n
    models={i:n for i,n in typed.items() if n['name']=='Model'}
    curves={i:n for i,n in typed.items() if n['name']=='AnimationCurve'}
    conn=next(n for n in nodes if n['name']=='Connections')
    cn_to_model={}; curve_to_cn={}
    for c in conn['children']:
        p=c['props']
        if len(p)<3:continue
        typ,a,b=p[:3]
        if typ=='OP' and len(p)>=4:
            prop=p[3]
            if typed.get(a,{}).get('name')=='AnimationCurveNode' and typed.get(b,{}).get('name')=='Model' and prop in {'Lcl Rotation','Lcl Translation'}:
                cn_to_model[a]=(b,prop)
            elif typed.get(a,{}).get('name')=='AnimationCurve' and typed.get(b,{}).get('name')=='AnimationCurveNode' and prop in {'d|X','d|Y','d|Z'}:
                curve_to_cn[a]=(b,prop[-1])
    model_channels={}
    all_dynamic_times=set()
    for cid,(cnid,axis) in curve_to_cn.items():
        if cnid not in cn_to_model:continue
        mid,prop=cn_to_model[cnid]
        times,vals=curve_values(curves[cid])
        model_channels.setdefault(mid,{}).setdefault(prop,{})[axis]=(times,vals)
        if len(times)>1: all_dynamic_times.update(times)
    times=sorted(all_dynamic_times)
    if not times: raise ValueError(f'No animation keys found in {path}')
    out={'times':[t/FBX_TICKS_PER_SECOND for t in times],'rotations':{},'translation':{}}
    for mid,model in models.items():
        name=clean_name(model['props'][1]) if len(model['props'])>1 else ''
        ch=model_channels.get(mid,{})
        props=properties70(model)
        pre=props.get('PreRotation',[0.0,0.0,0.0])
        pre=(float(pre[0]),float(pre[1]),float(pre[2])) if len(pre)>=3 else (0.0,0.0,0.0)
        default_r=props.get('Lcl Rotation',[0.0,0.0,0.0])
        default_r=(float(default_r[0]),float(default_r[1]),float(default_r[2])) if len(default_r)>=3 else (0.0,0.0,0.0)
        if 'Lcl Rotation' in ch:
            axes=ch['Lcl Rotation'];qs=[];prev=None
            for t in times:
                e=[]
                for j,ax in enumerate('XYZ'):
                    cv=axes.get(ax);e.append(eval_curve(*cv,t,default=default_r[j]) if cv else default_r[j])
                q=qnorm(qmul(q_euler_fbx_xyz(pre),q_euler_fbx_xyz(e)))
                if prev is not None and sum(prev[i]*q[i] for i in range(4))<0:q=tuple(-v for v in q)
                qs.append(q);prev=q
            out['rotations'][name]=qs
        if 'Lcl Translation' in ch:
            axes=ch['Lcl Translation'];default_t=props.get('Lcl Translation',[0.0,0.0,0.0])
            default_t=(float(default_t[0]),float(default_t[1]),float(default_t[2])) if len(default_t)>=3 else (0.0,0.0,0.0)
            tv=[]
            for t in times:
                v=[]
                for j,ax in enumerate('XYZ'):
                    cv=axes.get(ax);v.append((eval_curve(*cv,t,default=default_t[j]) if cv else default_t[j])/100.0)
                tv.append(tuple(v))
            out['translation'][name]=tv
    return out

# ---------------- GLB helpers ----------------
COMP_SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
TYPE_COUNT={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}

def read_glb(path: Path):
    b=path.read_bytes();magic,ver,total=struct.unpack_from('<4sII',b,0)
    if magic!=b'glTF' or ver!=2:raise ValueError(f'Not glTF 2 GLB: {path}')
    off=12;js=None;bin_data=b''
    while off<total:
        ln,typ=struct.unpack_from('<I4s',b,off);off+=8;chunk=b[off:off+ln];off+=ln
        if typ==b'JSON':js=json.loads(chunk.decode('utf-8').rstrip(' \x00'))
        elif typ==b'BIN\x00':bin_data=chunk
    return js,bytearray(bin_data)

def read_accessor(js,bin_data,index):
    a=js['accessors'][index];bv=js['bufferViews'][a['bufferView']]
    if a['componentType']!=5126:raise ValueError('Expected float accessor')
    n=TYPE_COUNT[a['type']];start=bv.get('byteOffset',0)+a.get('byteOffset',0);stride=bv.get('byteStride',4*n);count=a['count']
    rows=[]
    for i in range(count):rows.append(struct.unpack_from('<'+'f'*n,bin_data,start+i*stride))
    return rows

def animation_channel_map(js,bin_data,name):
    a=next(a for a in js.get('animations',[]) if a.get('name')==name)
    out={}
    for ch in a['channels']:
        s=a['samplers'][ch['sampler']];node=js['nodes'][ch['target']['node']].get('name','');path=ch['target']['path']
        out[(node,path)]={'times':[r[0] for r in read_accessor(js,bin_data,s['input'])],'values':read_accessor(js,bin_data,s['output'])}
    return out

def pad4(buf: bytearray):
    while len(buf)%4:buf.append(0)

def add_float_accessor(js,bin_data,rows,kind):
    pad4(bin_data);offset=len(bin_data);flat=[]
    if kind=='SCALAR':
        flat=[float(r if not isinstance(r,(tuple,list)) else r[0]) for r in rows]
    else:
        for r in rows:flat.extend(float(v) for v in r)
    bin_data.extend(struct.pack('<'+'f'*len(flat),*flat));length=4*len(flat)
    bv_index=len(js.setdefault('bufferViews',[]));js['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':length})
    a={'bufferView':bv_index,'componentType':5126,'count':len(rows),'type':kind}
    if kind=='SCALAR' and rows:
        vals=[float(r if not isinstance(r,(tuple,list)) else r[0]) for r in rows];a['min']=[min(vals)];a['max']=[max(vals)]
    ai=len(js.setdefault('accessors',[]));js['accessors'].append(a);return ai

def append_animation(js,bin_data,name,times,rotations,translations):
    # Remove prior clip of same name if rebuilding.
    js['animations']=[a for a in js.get('animations',[]) if a.get('name')!=name]
    node_index={n.get('name'):i for i,n in enumerate(js.get('nodes',[]))}
    time_acc=add_float_accessor(js,bin_data,times,'SCALAR')
    anim={'name':name,'samplers':[],'channels':[]}
    # Match established DEADHAUL convention: rotations first by node order, Hips translation after Hips rotation.
    for ni,node in enumerate(js.get('nodes',[])):
        bn=node.get('name')
        if bn in rotations:
            out=add_float_accessor(js,bin_data,rotations[bn],'VEC4');si=len(anim['samplers'])
            anim['samplers'].append({'input':time_acc,'output':out,'interpolation':'LINEAR'})
            anim['channels'].append({'sampler':si,'target':{'node':ni,'path':'rotation'}})
        if bn in translations:
            out=add_float_accessor(js,bin_data,translations[bn],'VEC3');si=len(anim['samplers'])
            anim['samplers'].append({'input':time_acc,'output':out,'interpolation':'LINEAR'})
            anim['channels'].append({'sampler':si,'target':{'node':ni,'path':'translation'}})
    js.setdefault('animations',[]).append(anim)

def resample_rows(times,rows,new_times):
    if len(times)==1:return [rows[0] for _ in new_times]
    out=[]
    # Rotations use normalized lerp with sign correction; sufficient because source is 30fps.
    is_quat=len(rows[0])==4
    for t in new_times:
        if t<=times[0]:out.append(tuple(rows[0]));continue
        if t>=times[-1]:out.append(tuple(rows[-1]));continue
        i=bisect.bisect_right(times,t)-1;t0,t1=times[i],times[i+1];u=(t-t0)/(t1-t0)
        a=rows[i];b=rows[i+1]
        if is_quat and sum(a[j]*b[j] for j in range(4))<0:b=tuple(-v for v in b)
        r=tuple(a[j]+(b[j]-a[j])*u for j in range(len(a)))
        if is_quat:r=qnorm(r)
        out.append(r)
    return out

UPPER_PISTOL_BONES={
    'mixamorig:Spine2','mixamorig:LeftShoulder','mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand',
    'mixamorig:RightShoulder','mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand',
}
for side in ('Left','Right'):
    for finger in ('Thumb','Index','Middle','Ring','Pinky'):
        for j in (1,2,3):UPPER_PISTOL_BONES.add(f'mixamorig:{side}Hand{finger}{j}')

def inject_into_glb(path: Path, slow, fast):
    js,bin_data=read_glb(path)
    required=set(slow['rotations'])
    node_names={n.get('name') for n in js.get('nodes',[])}
    missing=sorted((required & {n for n in required if n.startswith('mixamorig:')})-node_names)
    if missing:raise ValueError(f'{path.name}: skeleton mismatch: {missing[:5]}')

    # Direct authored locomotion clips. Mixamo supplied these with forward root motion; DEADHAUL's
    # collision controller already moves the player, so strip Hips Z travel while retaining vertical
    # bob and small lateral sway. This keeps the skeleton centered on the player capsule/viewmodel.
    def without_forward_root(motion):
        out={'times':list(motion['times']),'rotations':motion['rotations'],'translation':{k:list(v) for k,v in motion['translation'].items()}}
        hips=out['translation'].get('mixamorig:Hips')
        if hips:
            rest_z=float(next((n.get('translation',[0,0,0])[2] for n in js.get('nodes',[]) if n.get('name')=='mixamorig:Hips'),hips[0][2]))
            out['translation']['mixamorig:Hips']=[(v[0],v[1],rest_z) for v in hips]
        return out
    slow_nr=without_forward_root(slow);fast_nr=without_forward_root(fast)
    append_animation(js,bin_data,'pistol_walk',slow_nr['times'],slow_nr['rotations'],slow_nr['translation'])
    append_animation(js,bin_data,'pistol_run',fast_nr['times'],fast_nr['rotations'],fast_nr['translation'])
    append_animation(js,bin_data,'pistol_sprint',fast_nr['times'],fast_nr['rotations'],fast_nr['translation'])

    # Stationary pistol pose: preserve the existing breathing/leg idle, but replace the upper-body
    # channels with a static frame from the pistol animation so pistols never fall back to rifle poses.
    base=animation_channel_map(js,bin_data,'unarmed_idle')
    base_times=next(iter(base.values()))['times']
    rots={};trans={}
    for (bone,kind),data in base.items():
        if kind=='rotation':rots[bone]=[tuple(v) for v in data['values']]
        elif kind=='translation':trans[bone]=[tuple(v) for v in data['values']]
    pose_index=0
    for bone in UPPER_PISTOL_BONES:
        if bone in slow['rotations']:
            q=tuple(slow['rotations'][bone][pose_index]);rots[bone]=[q for _ in base_times]
    append_animation(js,bin_data,'pistol_idle',base_times,rots,trans)
    append_animation(js,bin_data,'pistol_aim_idle',base_times,rots,trans)

    pad4(bin_data);js['buffers'][0]['byteLength']=len(bin_data)
    # add provenance in asset extras without affecting loading
    js.setdefault('asset',{}).setdefault('extras',{})['deadhaulPistolAnimations']='2.5.8'
    write_glb(path,js,bin_data)

def write_glb(path,js,bin_data):
    raw=json.dumps(js,separators=(',',':')).encode('utf-8')
    while len(raw)%4:raw+=b' '
    b=bytes(bin_data)
    while len(b)%4:b+=b'\x00'
    total=12+8+len(raw)+8+len(b)
    out=bytearray(struct.pack('<4sII',b'glTF',2,total));out.extend(struct.pack('<I4s',len(raw),b'JSON'));out.extend(raw);out.extend(struct.pack('<I4s',len(b),b'BIN\x00'));out.extend(b)
    path.write_bytes(out)


def main(argv):
    if len(argv)<4:
        print(__doc__);return 2
    slow=extract_mixamo_motion(Path(argv[1]));fast=extract_mixamo_motion(Path(argv[2]))
    print(f'Pistol clip A: {len(slow["times"])} frames, {slow["times"][-1]:.3f}s')
    print(f'Pistol clip B: {len(fast["times"])} frames, {fast["times"][-1]:.3f}s')
    for p in map(Path,argv[3:]):
        inject_into_glb(p,slow,fast);print('updated',p)
    return 0
if __name__=='__main__':raise SystemExit(main(sys.argv))
