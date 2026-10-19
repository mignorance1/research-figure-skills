"""Behavioral checks for path geometry and PPTX preservation; stdlib only."""
import math
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as E
from zipfile import ZipFile
from curved_arrows import apply_paths, curve_polygon, NS


class GeometryTests(unittest.TestCase):
    def test_all_four_directions_have_the_requested_tip(self):
        for end in [(80,50),(20,50),(50,80),(50,20)]:
            start=(50,50);dx,dy=end[0]-50,end[1]-50
            c=[start,(50+dx/3,50+dy/3),(50+dx*2/3,50+dy*2/3),end]
            polygon=curve_polygon({'segments':[c],'width':4,'head_width':12,'head_length':9})
            self.assertIn(end,polygon)
            self.assertTrue(all(math.isfinite(v) for q in polygon for v in q))

    def test_band_does_not_gain_an_arrowhead(self):
        p=curve_polygon({'segments':[[[10,20],[30,20],[60,20],[80,20]]],'width':4,'head':False})
        self.assertAlmostEqual(max(y for _,y in p)-min(y for _,y in p),4)
        self.assertAlmostEqual(max(x for x,_ in p),80)

    def test_disconnected_and_zero_curves_are_rejected(self):
        for segments in [[[[10,10]]*4],[[[10,10],[15,10],[20,10],[30,10]],[[31,10],[40,10],[50,10],[60,10]]]]:
            with self.assertRaises(ValueError):curve_polygon({'segments':segments})

    def test_invalid_numeric_width_and_points_are_rejected(self):
        c=[[[10,20],[30,20],[60,20],[80,20]]]
        for width in [0,-1,float('nan'),True]:
            with self.assertRaises(ValueError):curve_polygon({'segments':c,'width':width})
        with self.assertRaises(ValueError):curve_polygon({'segments':[[[10,10],[20,20],[float('inf'),20],[40,40]]]})


class PackageTests(unittest.TestCase):
    def test_grouping_preserves_unrelated_parts_and_editable_geometry(self):
        p,a,r=NS['p'],NS['a'],NS['r']
        presentation=f'<p:presentation xmlns:p="{p}" xmlns:r="{r}"><p:sldIdLst><p:sldId id="1" r:id="r1"/></p:sldIdLst><p:sldSz cx="1000000" cy="1000000"/></p:presentation>'.encode()
        rels=b'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Target="slides/slide1.xml"/></Relationships>'
        slide=f'<p:sld xmlns:p="{p}" xmlns:a="{a}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="panel__existing"/></p:nvSpPr><p:spPr/></p:sp></p:spTree></p:cSld></p:sld>'.encode()
        data={'ppt/presentation.xml':presentation,'ppt/_rels/presentation.xml.rels':rels,'ppt/slides/slide1.xml':slide,'ppt/media/retained.bin':b'unchanged bytes'}
        spec={'canvas':[100,100],'paths':[{'name':'panel__arrow','segments':[[[10,20],[30,20],[60,20],[80,20]]],'width':4}],'groups':[{'prefix':'panel__','name':'Scientific stage','box':[0,0,100,100]}]}
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'source.pptx';out=Path(folder)/'out.pptx'
            with ZipFile(source,'w') as z:
                for name,content in data.items():z.writestr(name,content)
            original=source.read_bytes();apply_paths(source,out,spec)
            self.assertEqual(source.read_bytes(),original)
            with ZipFile(out) as z:
                for name,content in data.items():
                    if name!='ppt/slides/slide1.xml':self.assertEqual(z.read(name),content)
                doc=E.fromstring(z.read('ppt/slides/slide1.xml'))
            group=doc.find('.//p:grpSp',NS);self.assertIsNotNone(group)
            self.assertEqual(len(group.findall('p:sp',NS)),2)
            self.assertIsNotNone(group.find('.//a:custGeom/a:pathLst/a:path/a:close',NS))
            with self.assertRaises(ValueError):apply_paths(source,source,spec)
            with self.assertRaises(ValueError):apply_paths(source,out,dict(spec,slide=2))


if __name__=='__main__':unittest.main()
