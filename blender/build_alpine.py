"""Reference-inspired alpine village. Run with Blender --background --python this_file.
Builds an editable scene, a web GLB, and a preview. No external asset downloads.
The pine scan is the existing CC0 Poly Haven asset; architecture/terrain authored here.
"""
import bpy, math, random, os
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector
R=Path(__file__).resolve().parents[1]
random.seed(824)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def material(name, color, rough=.75, metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
 return m
stone=material('Warm limestone',(.39,.36,.29)); wood=material('Weathered cedar',(.22,.105,.046)); trim=material('Dark structural timber',(.095,.051,.024)); plaster=material('Ivory mineral plaster',(.65,.60,.49)); roof=material('Slate shingles',(.095,.12,.13)); glass=material('Blue reflective glazing',(.10,.23,.27),.16,.45); grass=material('Alpine meadow',(.15,.22,.10)); rock=material('Stratified limestone',(.34,.33,.29)); snow=material('High altitude snow',(.85,.90,.93)); pathmat=material('Gravel paths',(.36,.33,.26)); water=material('Glacial river',(.035,.30,.32),.18,.3)
# Image-backed materials preserve surface variation when exported to glTF.
def texture(mat, kind, base):
 size=256; img=bpy.data.images.new(mat.name+' surface',width=size,height=size)
 pixels=[]
 for y in range(size):
  for x in range(size):
   n=random.uniform(-.08,.08)
   if kind=='wood': n+=.055*math.sin(x*.45+math.sin(y*.04)*2)+.025*math.sin(x*1.5+y*.01)
   if kind=='stone': n+=.035*math.sin(y*.13+math.sin(x*.025)*2)
   pixels.extend([max(.01,min(.95,c*(1+n))) for c in base]+[1])
 img.pixels=pixels; img.pack()
 nodes=mat.node_tree.nodes; tex=nodes.new('ShaderNodeTexImage');tex.image=img
 mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
texture(wood,'wood',(.30,.15,.065));texture(stone,'stone',(.46,.43,.37));texture(rock,'stone',(.40,.40,.37))

def cube(name,loc,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft physical edges','BEVEL');mod.width=bevel;mod.segments=2
 return o

def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

def beam(name,a,b,width,mat):
 a,b=Vector(a),Vector(b);o=cube(name,(a+b)/2,(width,width,(b-a).length),mat,.025);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

# Sloped, banded ridges; gaps between foreground peaks form the flight corridor.
peaks=[(-210,235,150,190),(-80,335,205,175),(90,355,230,205),(255,235,165,165),(-220,-10,100,120),(230,25,125,140)]
def height(x,y):
 h=.8+1.2*math.sin(x*.024)*math.sin(y*.02)
 for px,py,amp,r in peaks:
  d=math.hypot((x-px)/r,(y-py)/(r*.74)); crest=max(0,1-d)
  h+=amp*crest**1.25*(1+.065*math.sin(x*.11+y*.06)+.025*math.sin(y*.33-x*.19))
 # A gentle village shelf allows buildings and paths to share the same ground.
 if abs(x)<65 and -35<y<140:h=.8
 rx=80+18*math.sin(y*.018);distance=abs(x-rx)
 t=max(0,min(1,(distance-11)/75));t=t*t*(3-2*t)
 fade=max(0,min(1,(260-y)/80));fade=fade*fade*(3-2*fade)
 h=h*(1-fade)+(-.4+(h+.4)*t)*fade
 return h
N=220;verts=[];faces=[]
for j in range(N):
 for i in range(N):
  x=-470+i*940/(N-1);y=-240+j*850/(N-1);verts.append((x,y,height(x,y)))
for j in range(N-1):
 for i in range(N-1):
  a=j*N+i;faces.append((a,a+1,a+N+1,a+N))
terrain=mesh('Mountain ridges and valley',verts,faces,grass);terrain.data.materials.append(rock);terrain.data.materials.append(snow)
# Continuous vertex colors prevent a blocky snow line or grass/rock boundary.
terrain.data.materials.clear()
terrain_material=material('Mountain elevation colors',(.4,.4,.4))
node=terrain_material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='TerrainColor'
terrain_material.node_tree.links.new(node.outputs['Color'],terrain_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
terrain.data.materials.append(terrain_material)
col=terrain.data.color_attributes.new(name='TerrainColor',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(terrain.data.vertices):
 x,y,z=v.co
 t=max(0,min(1,(z-12)/28));st=max(0,min(1,(z-110-12*math.sin(x*.065))/38))
 variation=.85+.10*math.sin(z*.55+x*.025)+random.random()*.1
 c=Vector((.16,.235,.105)).lerp(Vector((.39,.37,.31))*variation,t).lerp(Vector((.88,.91,.94)),st)
 col.data[i].color=(*c,1)
for p in terrain.data.polygons:p.use_smooth=True
# UVs in world units give rock strata consistent scale.
uv=terrain.data.uv_layers.new(name='Terrain UV')
for p in terrain.data.polygons:
 for li in p.loop_indices:
  v=terrain.data.vertices[terrain.data.loops[li].vertex_index].co;uv.data[li].uv=(v.x/38,v.y/38)

# Joined perimeter rings carry the original terrain into a distant horizon.
# The first ring exactly follows the existing terrain boundary; all later rings
# remain beyond it, so there is no overlapping ground or visible vertical seam.
perimeter=[]
for i in range(N):perimeter.append((-470+i*940/(N-1),-240))
for j in range(1,N):perimeter.append((470,-240+j*850/(N-1)))
for i in range(N-2,-1,-1):perimeter.append((-470+i*940/(N-1),610))
for j in range(N-2,0,-1):perimeter.append((-470,-240+j*850/(N-1)))
outer=[];L=len(perimeter)
for ring in range(9):
 t=ring/8
 for x,y in perimeter:
  xx=x*(1+3*t); yy=185+(y-185)*(1+3*t)
  angle=math.atan2(yy-185,xx)
  ridge=95+100*(.5+.5*math.sin(angle*7+.7))+65*(.5+.5*math.sin(angle*13))
  z=height(x,y)*(1-t)+ridge*math.sin(t*math.pi*.84)**1.5
  outer.append((xx,yy,z))
outer_faces=[]
for r in range(8):
 for i in range(L):
  a=r*L+i;b=r*L+(i+1)%L;outer_faces.append((a,b,b+L,a+L))
horizon=mesh('Distant continuous forested foothills',outer,outer_faces,material('Distant spruce slopes',(.105,.17,.145)))
for poly in horizon.data.polygons:poly.use_smooth=True

# River ribbon and irregular gravel banks follow the valley rather than a flat disk.
river=[]
for i in range(101):
 y=-230+i*6; x=80+18*math.sin(y*.018);river.append((x,y))
for name,width,z,mat in [('River gravel banks',15,.88,stone),('Turquoise river',12,.95,water)]:
 vs=[];fs=[]
 for i,(x,y) in enumerate(river):
  w=width*(1+.12*math.sin(i*.37));vs.extend([(x-w,y,z),(x+w,y,z)])
  if i<100:a=2*i;fs.append((a,a+1,a+3,a+2))
 mesh(name,vs,fs,mat)
# Street and walking route.
cube('Village main street',(0,78,.91),(12,115,.10),pathmat,.1)
for x in [-8,8]:cube('Stone pedestrian paving',(x,78,1.02),(3.5,115,.20),stone,.08)

def cabin(x,y,w=10,d=9,h=6,style='lodge'):
 base=height(x,y);front=y-d/2
 wall=wood if style=='cabin' else stone if style=='inn' else plaster
 cube('Stone foundation',(x,y,base+.65),(w+.35,d+.35,1.3),stone,.12)
 cube('Plastered upper walls',(x,y,base+1.3+h/2),(w,d,h),wall,.06)
 eave=base+1.3+h;ridge=eave+w*.32
 # Full gabled volume, including the hidden rear elevation.
 vs=[(x-w/2,y-d/2,eave),(x+w/2,y-d/2,eave),(x,y-d/2,ridge),(x-w/2,y+d/2,eave),(x+w/2,y+d/2,eave),(x,y+d/2,ridge)]
 mesh('Gabled end walls',vs,[(0,1,2),(5,4,3)],wall)
 angle=math.atan(.64)
 for side in [-1,1]:
  o=cube('Overhanging slate roof',(x+side*w/4,y,eave+w*.16),((w/2+.65)/math.cos(angle),d+1.1,.18),roof,.04);o.rotation_euler.y=side*angle
  for row in range(10):
   dx=(row+.5)*(w/2+.4)/10
   beam('Roof shingle courses',(x+side*dx,y-d/2-.52,ridge-dx*.64+.12),(x+side*dx,y+d/2+.52,ridge-dx*.64+.12),.045,trim)
 for xx in [x-w/2+.12,x,x+w/2-.12]:cube('Facade timber upright',(xx,front-.10,base+1.3+h/2),(.22,.26,h),trim,.025)
 for zz in [base+1.3,base+1.3+h*.50,eave]:cube('Facade timber cross beam',(x,front-.12,zz),(w,.28,.22),trim,.025)
 for side in [-1,1]:
  beam('Gable bargeboard',(x+side*(w/2+.5),front-.55,eave-.2),(x,front-.55,ridge+.15),.23,trim)
  for floor in [0,1]:
   xx=x+side*w*.27;zz=base+2.1+floor*h*.5
   cube('Deep window frame',(xx,front-.18,zz+.8),(w*.31,.20,2.0),wood,.025)
   cube('Recessed glazing',(xx,front-.295,zz+.8),(w*.27,.025,1.74),glass,.01)
   cube('Window vertical mullion',(xx,front-.33,zz+.8),(.065,.04,1.8),trim)
   cube('Window horizontal mullion',(xx,front-.33,zz+.8),(w*.28,.04,.065),trim)
 cube('Entrance door',(x,front-.23,base+2.35),(1.25,.12,2.1),wood,.035)
 cube('Entrance step',(x,front-.75,base+1.1),(2.1,1.0,.20),stone,.06)
 # Timber porch brackets and a shallow metal canopy.
 canopy=cube('Porch canopy',(x,front-.95,base+4.0),(w+.4,1.9,.13),roof,.035);canopy.rotation_euler.x=.12
 for dx in [-w*.4,w*.4]:beam('Porch diagonal bracket',(x+dx,front-.2,base+3.05),(x+dx,front-1.5,base+3.85),.15,wood)
 cube('Masonry chimney',(x+w*.27,y+d*.20,ridge-.1),(1.05,1.05,2.5),stone,.05)
 cube('Chimney cap',(x+w*.27,y+d*.20,ridge+1.2),(1.3,1.3,.20),roof,.035)
 # Side elevations are visible from the descent; give them windows and sills too.
 for side in [-1,1]:
  for dy in [-d*.25,d*.25]:
   for floor in range(1 if h<5 else 2):
    z=base+2.5+floor*2.6
    cube('Side window surround',(x+side*(w/2+.04),y+dy,z),(.16,1.8,1.8),wood,.03)
    cube('Side glazing',(x+side*(w/2+.13),y+dy,z),(.035,1.5,1.5),glass)
    cube('Stone window sill',(x+side*(w/2+.20),y+dy,z-.9),(.42,2,.14),stone)
 if style=='cabin':
  for z in range(int(h/.32)):
   cube('Cedar siding',(x,front-.05,base+1.4+z*.32),(w,.12,.035),trim)
 if style=='inn':
  cube('Inn balcony deck',(x,front-1.25,base+4.25),(w*.8,2.3,.23),wood)
  beam('Balcony handrail',(x-w*.4,front-2.3,base+5.3),(x+w*.4,front-2.3,base+5.3),.12,trim)
  for n in range(15):
   xx=x-w*.4+n*w*.8/14
   beam('Balcony baluster',(xx,front-2.3,base+4.4),(xx,front-2.3,base+5.3),.075,trim)
 if style=='shop':
  cube('Shop fascia',(x,front-.4,base+4.4),(w*.82,.18,.6),wood,.04)
  for side in [-1,1]:
   cube('Flower box',(x+side*w*.28,front-.65,base+1.5),(2.2,.75,.45),wood,.05)
for x,y,w,d,h,style in [(-22,25,12,12,6,'shop'),(22,42,9,10,4,'cabin'),(-25,58,17,12,8,'inn'),(25,80,14,12,7,'lodge'),(-23,98,10,11,4,'cabin'),(23,122,13,10,6,'shop')]:
 cabin(x,y,w,d,h,style)
# Outlying cottages continue the settlement into the foothills.
for x,y in [(-47,165),(30,176),(-59,211),(8,229)]:cabin(x,y,8,8,4,'cabin')
# Street lights and benches at a human scale.
for y in [15,43,72,102,128]:
 for x in [-10.5,10.5]:
  cube('Lamp stone plinth',(x,y,1.3),(.7,.7,.6),stone,.05);beam('Street lamp',(x,y,1.5),(x,y,6),.12,trim)
  cube('Lantern frame',(x,y,5.8),(.60,.60,.85),trim,.04);cube('Lantern glass',(x,y-.32,5.8),(.43,.03,.61),glass)
  cube('Lantern cap',(x,y,6.28),(.78,.78,.12),roof,.03)
for y in [8,54,91]:
 for dz in [0,.20,.4]:cube('Bench seat slats',(-13,y+dz,1.45),(2,.15,.10),wood,.025)
 for x in [-13.7,-12.3]:cube('Bench supports',(x,y+.2,1.15),(.13,.65,.65),trim)
 beam('Bench back',(-14,y+.6,1.85),(-12,y+.6,1.85),.2,wood)
# Reuse the already licensed scanned pines, with linked meshes for the .blend.
existing=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(R/'assets/models/pine/optimized.glb'))
imported=[o for o in bpy.data.objects if o not in existing]
parts=[o for o in imported if o.type=='MESH']
empty_names=[o.name for o in imported if o.type!='MESH']
for o in parts:
 world_matrix=o.matrix_world.copy();o.parent=None;o.matrix_world=world_matrix
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
if parts:
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();tree=bpy.context.object;tree.name='Scanned pine cluster source'
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 dec=tree.modifiers.new('Forest preview detail budget','DECIMATE');dec.ratio=.1;bpy.ops.object.modifier_apply(modifier=dec.name)
 bounds=[tree.matrix_world@Vector(c) for c in tree.bound_box];low=min(v.z for v in bounds);high=max(v.z for v in bounds);cx=sum(v.x for v in bounds)/8;cy=sum(v.y for v in bounds)/8
 for v in tree.data.vertices:v.co.x-=cx;v.co.y-=cy;v.co.z-=low
 tree.location=(0,0,-1000);tree.hide_render=True
 for i in range(620):
  x=random.uniform(-210,230);y=random.uniform(-110,310)
  rx=80+18*math.sin(y*.018)
  if abs(x-rx)<19 or (abs(x)<39 and -30<y<150):continue
  z=height(x,y)
  if z>95:continue
  o=bpy.data.objects.new('Forest scanned pines',tree.data);bpy.context.collection.objects.link(o);o.location=(x,y,z);o.rotation_euler.z=random.random()*math.tau;o.scale=(random.uniform(10,20)/max(high-low,.1),)*3
 bpy.data.objects.remove(tree,do_unlink=True)
for name in empty_names:
 o=bpy.data.objects.get(name)
 if o:bpy.data.objects.remove(o,do_unlink=True)
# A clear destination pad; website supplies the existing Paul/Odie animation here.
cube('Riverside clearing',(0,-19,.86),(18,15,.10),grass,.15)
# Lighting, camera and real-time compatible export.
world=bpy.context.scene.world or bpy.data.worlds.new('Alpine sky');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.47,.65,.82,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.light_add(type='SUN',location=(-100,-120,220));sun=bpy.context.object;sun.name='Late afternoon sunlight';sun.rotation_euler=(.48,-.45,-.55);sun.data.energy=3;sun.data.angle=.07
bpy.ops.object.camera_add(location=(195,-325,185));cam=bpy.context.object;cam.rotation_euler=(Vector((0,95,65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=35;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/alpine-village.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH':o.select_set(True)
# Consolidate rigid meshes by category for efficient browser draw calls.
for prefix in ['Village']:
 bpy.ops.object.select_all(action='DESELECT')
 selected=[]
 for o in scene.objects:
  if o.type!='MESH':continue
  is_forest=o.name.startswith('Forest')
  is_arch=not is_forest and o!=terrain and o!=horizon and not ('river' in o.name.lower()) and o.name!='Riverside clearing'
  if (prefix=='Forest' and is_forest) or (prefix=='Village' and is_arch):
   selected.append(o)
 for o in selected:
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  o.select_set(True)
 if selected:
  bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();bpy.context.object.name=prefix+' export batch'
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(R/'assets/models/alpine/village.glb'),export_format='GLB',use_selection=True,export_apply=True)
if os.environ.get('ALPINE_SKIP_RENDER'): print('ALPINE_COMPLETE'); raise SystemExit(0)
scene.render.filepath=str(R/'previews/alpine-village.png');bpy.ops.render.render(write_still=True)
cam.location=(32,-22,13);cam.rotation_euler=(Vector((0,62,8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=38
scene.render.filepath=str(R/'previews/alpine-street.png');bpy.ops.render.render(write_still=True)
print('ALPINE_COMPLETE')
