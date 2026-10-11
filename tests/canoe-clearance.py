from PIL import Image
from collections import deque
import re, json

def shoreline(path):
    im=Image.open(path).convert('RGB'); w,h=im.size
    pixels=im.load(); land=bytearray(w*h); q=deque()
    def solid(x,y):
        r,g,b=pixels[x,y]
        return not (b>g*.78 and r<g*.65)
    for y in range(h):
        for x in (0,w-1):
            if solid(x,y):land[y*w+x]=1;q.append(y*w+x)
    while q:
        i=q.popleft();x=i%w;y=i//w
        for xx,yy in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0<=xx<w and 0<=yy<h:
                j=yy*w+xx
                if not land[j] and solid(xx,yy):land[j]=1;q.append(j)
    return w,h,land
river=shoreline('assets/harbour-continuous-river.png')
junction=shoreline('assets/river-shoreline-junction.png')
pts=json.loads(re.search(r'const CANOE_CHANNEL = (.*);',open('harbour.js').read())[1]);bad=[]
for a,b in zip(pts,pts[1:]):
    for k in range(81):
        t=k/80;y=a[0]+(b[0]-a[0])*t;f=t*t*(3-2*t);x=a[1]+(b[1]-a[1])*f
        for dx in range(-180,181,20):
            for dy in [-40,0,35]:
                wy=y+dy
                w,h,land=junction if wy<2450 else river
                top,height=(850,1600) if wy<2450 else (1120,4800)
                px=int((x+dx+300)/3200*w);py=int((wy-top)/height*h)
                if 0<=px<w and 0<=py<h and land[py*w+px]:bad.append((round(x),round(y),px,py))
print('Connected shoreline contacts:',len(bad),bad[:12])
assert not bad, 'Canoe hull intersects the connected shoreline'
