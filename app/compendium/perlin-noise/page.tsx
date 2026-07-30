import Link from "next/link";
export const metadata={title:"Perlin Noise & Coherent Randomness"};
export default function PerlinArticle(){return <main className="comp-entry"><header><Link className="back" href="/compendium">Compendium</Link><span className="folio">Entry 004 / Procedural Fields</span></header><article>
  <p className="eyebrow">Field Note 004</p><h1>Coherent<br/>Randomness</h1><p className="comp-lede">White noise forgets its neighbors. Gradient noise gives nearby points a shared local story, producing hills, folds, clouds, and terrain without prescribing any of them.</p>
  <Link className="comp-exhibit-link" href="/gallery/perlin-noise">Enter the field generator →</Link>
  <section><h2>A lattice of directions</h2><p>Perlin noise begins by assigning a pseudorandom gradient vector to each lattice corner. A sample point measures its displacement against those nearby directions, creating four local dot products rather than four unrelated random values.</p></section>
  <section><h2>Smooth agreement</h2><p>The corner contributions are blended with a fade curve. Perlin’s quintic curve has zero first and second derivatives at cell boundaries, hiding the underlying grid and producing continuous, natural-looking transitions.</p></section>
  <section><h2>Octaves</h2><p>One field supplies broad masses. Successively doubled frequencies add smaller structure, while a roughness rule controls how quickly their amplitudes decay. The sum is fractal noise: statistical resemblance across scales without literal repetition.</p></section>
  <section><h2>Generalizing the recipe</h2><p>The exhibit changes the gradient distribution, interpolation law, spatial correlation, and color mapping. These deviations reveal which qualities belong to gradient noise itself and which are consequences of the familiar textbook choices.</p></section>
  <Link className="comp-exhibit-link bottom" href="/gallery/perlin-noise">Generate a new field →</Link>
</article></main>}
