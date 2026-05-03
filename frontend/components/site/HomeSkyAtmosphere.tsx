/** Capas decorativas fijas (solo portada). z-index 0; el contenido va en hermano con z-[1]. */
export function HomeSkyAtmosphere() {
  return (
    <>
      <div className="stars-zone" aria-hidden>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="star-twinkle" />
        ))}
      </div>

      <div className="nebula-zone" aria-hidden>
        <div className="nebula nebula-1" />
        <div className="nebula nebula-2" />
      </div>

      <div className="clouds-zone" aria-hidden>
        <div className="dark-cloud dark-cloud-1" />
        <div className="dark-cloud dark-cloud-2" />
      </div>

      <div className="horizon-zone" aria-hidden>
        <div className="horizon-pulse" />
        <div className="horizon-rays" />
      </div>

      <div className="city-lights-zone" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="city-light" />
        ))}
      </div>
    </>
  );
}
