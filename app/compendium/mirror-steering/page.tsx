import Link from "next/link";
export const metadata={title:"Steering Light with a Mirror"};
export default function MirrorArticle(){return <main className="comp-entry"><header><Link className="back" href="/compendium/logs">Logs</Link><span className="folio">Entry 005 / Geometric Optics</span></header><article>
  <p className="eyebrow">Field Note 005</p><h1>Steering<br/>Light</h1><p className="comp-lede">To send one ray into another direction, a plane mirror must face halfway between them. In three dimensions, that simple sentence becomes a surprisingly elegant piece of vector geometry.</p>
  <Link className="comp-exhibit-link" href="/gallery/mirror-steering">Open the steering table →</Link>
  <section><h2>The bisector normal</h2><p>For unit incident and outgoing directions u and v, the required mirror normal lies along their normalized sum: n = (u + v)/|u + v|. It makes equal angles with both rays, satisfying the law of reflection.</p></section>
  <section><h2>Two rotations at once</h2><p>When the outgoing ray leaves the original plane, the mirror normal changes both azimuth and elevation. A single apparent deflection of the beam therefore demands a coupled yaw-and-tilt pose from the mirror.</p></section>
  <section><h2>The factor of two</h2><p>For rotation within one plane, turning a mirror through a small angle turns the reflected ray through twice that angle. In full 3D the same sensitivity survives locally, but the resulting path lies on the sphere of directions.</p></section>
  <section><h2>The singular reversal</h2><p>If output is exactly opposite input, u + v vanishes. There is then no unique bisector normal: any mirror whose normal is perpendicular to the ray can reverse it. The apparent failure of the formula reveals a real geometric degeneracy.</p></section>
  <Link className="comp-exhibit-link bottom" href="/gallery/mirror-steering">Aim the reflected ray →</Link>
</article></main>}
