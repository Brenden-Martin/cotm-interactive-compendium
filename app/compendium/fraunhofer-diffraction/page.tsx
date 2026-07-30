import Link from "next/link";
export const metadata={title:"Fraunhofer Diffraction"};
export default function DiffractionArticle(){return <main className="comp-entry"><header><Link className="back" href="/compendium">Compendium</Link><span className="folio">Entry 003 / Wave Optics</span></header><article>
  <p className="eyebrow">Field Note 003</p><h1>Fraunhofer<br/>Diffraction</h1>
  <p className="comp-lede">A square cut into an opaque screen writes a luminous cross at infinity. Its far field is not a shadow, but the spatial-frequency portrait of the complex light admitted by the opening.</p>
  <Link className="comp-exhibit-link" href="/gallery/square-aperture">Open the diffraction bench →</Link>
  <section><h2>The Fourier plane</h2><p>In the Fraunhofer limit—at great distance or in a lens’s focal plane—the complex field is proportional to the two-dimensional Fourier transform of the aperture field. What a detector records is its squared magnitude: I ∝ |F&#123;A exp(iφ)&#125;|².</p></section>
  <section><h2>Why the cross appears</h2><p>A uniform rectangle separates into an x factor and a y factor. Each transforms into a sinc function, so a square produces the product sinc²(kx) sinc²(ky): a bright central lobe with narrowing rows of side lobes along both axes.</p></section>
  <section><h2>Amplitude versus phase</h2><p>An amplitude envelope changes how strongly each point contributes. A phase envelope changes when it contributes. The detector cannot see phase directly, yet phase gradients displace the pattern and phase discontinuities reorganize its interference fringes.</p></section>
  <section><h2>A reciprocal ruler</h2><p>Make the aperture narrower and the pattern broadens; make it wider and the pattern contracts. This reciprocal relationship is a recurring signature of Fourier pairs, from optics and acoustics to quantum wave packets.</p></section>
  <section><h2>Draw the transform</h2><p>The exhibit’s drawing mode treats every painted pixel as a transmitting patch of the aperture. Lines perpendicular to an edge spread perpendicular to that edge in frequency space; repetition becomes a comb of orders; small details send energy toward high spatial frequencies.</p></section>
  <Link className="comp-exhibit-link bottom" href="/gallery/square-aperture">Shape the aperture field →</Link>
</article></main>}
