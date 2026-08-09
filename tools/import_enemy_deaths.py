#!/usr/bin/env python3
"""Inject authored Mixamo enemy death clips into DEADHAUL enemy GLBs.

Retargets each FBX clip from its own Mixamo bind pose to the target enemy's
bind pose, preserving the death root motion so the authored fall actually
moves the skinned body. Designed for Ch18/Ch35/SWAT-compatible Mixamo rigs.
"""
from __future__ import annotations
import json, math, struct, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_pistol_mixamo import (
    parse_fbx, walk, clean_name, properties70, extract_mixamo_motion,
    read_glb, write_glb, add_float_accessor, qmul, qnorm, q_euler_fbx_xyz,
)

def qinv(q):
    x,y,z,w=q
    d=x*x+y*y+z*z+w*w or 1.0
    return (-x/d,-y/d,-z/d,w/d)

def source_bind_pose(path: Path):
    binds={}
    for n in walk(parse_fbx(path)):
        if n['name']!='Model' or len(n.get('props',[]))<2: continue
        name=clean_name(n['props'][1])
        if not name.startswith('mixamorig:'): continue
        p=properties70(n)
        pre=p.get('PreRotation',[0.0,0.0,0.0]); rot=p.get('Lcl Rotation',[0.0,0.0,0.0]); tr=p.get('Lcl Translation',[0.0,0.0,0.0])
        pre=tuple(float(pre[i]) if i<len(pre) else 0.0 for i in range(3))
        rot=tuple(float(rot[i]) if i<len(rot) else 0.0 for i in range(3))
        tr=tuple((float(tr[i]) if i<len(tr) else 0.0)/100.0 for i in range(3))
        binds[name]={'rotation':qnorm(qmul(q_euler_fbx_xyz(pre),q_euler_fbx_xyz(rot))),'translation':tr}
    return binds

def target_bind_pose(js):
    out={}
    for n in js.get('nodes',[]):
        name=n.get('name','')
        if not name.startswith('mixamorig:'): continue
        out[name]={
            'rotation':tuple(n.get('rotation',[0,0,0,1])),
            'translation':tuple(n.get('translation',[0,0,0])),
        }
    return out

def retarget(motion, src_bind, tgt_bind):
    src_hips=src_bind.get('mixamorig:Hips',{}).get('translation',(0,1,0))[1] or 1.0
    tgt_hips=tgt_bind.get('mixamorig:Hips',{}).get('translation',(0,src_hips,0))[1] or src_hips
    scale=tgt_hips/src_hips if abs(src_hips)>1e-7 else 1.0
    rots={}; trans={}
    for bone,frames in motion['rotations'].items():
        if bone not in tgt_bind: continue
        sb=src_bind.get(bone,{}).get('rotation',(0,0,0,1)); tb=tgt_bind[bone]['rotation']; inv=qinv(sb)
        vals=[]; prev=None
        for q in frames:
            v=qnorm(qmul(tb,qmul(inv,q)))
            if prev is not None and sum(prev[i]*v[i] for i in range(4))<0: v=tuple(-x for x in v)
            vals.append(v); prev=v
        rots[bone]=vals
    for bone,frames in motion['translation'].items():
        if bone not in tgt_bind: continue
        sb=src_bind.get(bone,{}).get('translation',(0,0,0)); tb=tgt_bind[bone]['translation']
        trans[bone]=[
            (tb[0]+(v[0]-sb[0])*scale, tb[1]+(v[1]-sb[1])*scale, tb[2]+(v[2]-sb[2])*scale)
            for v in frames
        ]
    return {'times':motion['times'],'rotations':rots,'translation':trans,'scale':scale}

def append_animation(js,bin_data,name,times,rotations,translations):
    js['animations']=[a for a in js.get('animations',[]) if a.get('name')!=name]
    time_acc=add_float_accessor(js,bin_data,times,'SCALAR')
    anim={'name':name,'samplers':[],'channels':[]}
    for ni,node in enumerate(js.get('nodes',[])):
        bn=node.get('name')
        if bn in rotations:
            out=add_float_accessor(js,bin_data,rotations[bn],'VEC4'); si=len(anim['samplers'])
            anim['samplers'].append({'input':time_acc,'output':out,'interpolation':'LINEAR'})
            anim['channels'].append({'sampler':si,'target':{'node':ni,'path':'rotation'}})
        if bn in translations:
            out=add_float_accessor(js,bin_data,translations[bn],'VEC3'); si=len(anim['samplers'])
            anim['samplers'].append({'input':time_acc,'output':out,'interpolation':'LINEAR'})
            anim['channels'].append({'sampler':si,'target':{'node':ni,'path':'translation'}})
    js.setdefault('animations',[]).append(anim)

def inject(target: Path, clips):
    js,bin_data=read_glb(target); tgt=target_bind_pose(js)
    for name,fbx in clips:
        motion=extract_mixamo_motion(fbx); src=source_bind_pose(fbx); rt=retarget(motion,src,tgt)
        append_animation(js,bin_data,name,rt['times'],rt['rotations'],rt['translation'])
        print(f'{target.name}: {name}: {len(rt["times"])} keys {rt["times"][-1]:.3f}s scale={rt["scale"]:.4f}')
    while len(bin_data)%4: bin_data.append(0)
    js['buffers'][0]['byteLength']=len(bin_data)
    js.setdefault('asset',{}).setdefault('extras',{})['deadhaulEnemyDeathAnimations']='2.6.6'
    write_glb(target,js,bin_data)

def main(argv):
    if len(argv)!=7:
        print('usage: import_enemy_deaths.py forward.fbx generic.fbx front.fbx enemy_ch18.glb enemy_ch35.glb enemy_swat.glb'); return 2
    clips=[('death_forward',Path(argv[1])),('death_generic',Path(argv[2])),('death_front_hit',Path(argv[3]))]
    for p in map(Path,argv[4:7]): inject(p,clips)
    return 0
if __name__=='__main__': raise SystemExit(main(sys.argv))
