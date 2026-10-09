/**
 * Placeholders ilustrados (fase-1 §8): decorativos, `aria-hidden`, línea de 1,25 px con extremos redondeados.
 * Se muestran mientras no haya una foto autorizada para cada hueco.
 */

export type Ilustracion =
  | "salida"
  | "green"
  | "cuatro-bolas"
  | "trayectorias"
  | "curvas-norte"
  | "curvas-sur"
  | "horizonte"
  | "polo";

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

export function Dibujo({ tipo }: { tipo: Ilustracion }) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false">
      {tipo === "salida" && (
        <g {...trazo}>
          <path d="M40 140h160" />
          <circle cx="92" cy="128" r="7" />
          <circle cx="148" cy="128" r="7" />
          <path d="M120 140v-14" />
          <circle cx="120" cy="121" r="5" />
          <path d="M120 116 Q 150 30 214 60" strokeDasharray="1.5 6" />
        </g>
      )}
      {tipo === "green" && (
        <g {...trazo}>
          <ellipse cx="120" cy="140" rx="86" ry="22" />
          <ellipse cx="120" cy="140" rx="50" ry="12" strokeDasharray="2 5" />
          <path d="M132 140V48" />
          <path d="M132 48l34 13-34 13z" fill="currentColor" />
          <ellipse cx="132" cy="140" rx="5" ry="2" fill="currentColor" />
        </g>
      )}
      {tipo === "cuatro-bolas" && (
        <g {...trazo}>
          <ellipse cx="120" cy="132" rx="96" ry="26" />
          <circle cx="76" cy="126" r="7" />
          <circle cx="104" cy="138" r="7" />
          <circle cx="136" cy="124" r="7" />
          <circle cx="166" cy="136" r="7" />
          <path d="M184 128V60" />
          <path d="M184 60l26 10-26 10z" fill="currentColor" />
        </g>
      )}
      {tipo === "trayectorias" && (
        <g {...trazo}>
          <path d="M30 150 Q 110 10 210 100" strokeDasharray="1.5 6" />
          <path d="M40 150 Q 140 30 200 140" strokeDasharray="1.5 6" />
          <path d="M20 120 Q 120 40 220 130" strokeDasharray="1.5 6" />
          <path d="M60 150 Q 130 60 180 150" strokeDasharray="1.5 6" />
          <path d="M20 156h200" />
        </g>
      )}
      {(tipo === "curvas-norte" || tipo === "curvas-sur") && (
        <g {...trazo} transform={tipo === "curvas-norte" ? "translate(150 70)" : "translate(90 110)"}>
          <ellipse rx="110" ry="70" transform="rotate(-8)" />
          <ellipse rx="84" ry="52" transform="rotate(6)" />
          <ellipse rx="60" ry="36" transform="rotate(-4)" />
          <ellipse rx="36" ry="22" transform="rotate(10)" />
          <ellipse rx="14" ry="8" />
        </g>
      )}
      {tipo === "horizonte" && (
        <g {...trazo}>
          <path d="M10 120h220" />
          <path d="M10 134c30-6 50 6 80 0s50-6 80 0 40 6 60 0" />
          <path d="M10 148c30-6 50 6 80 0s50-6 80 0 40 6 60 0" strokeDasharray="2 5" />
          <circle cx="170" cy="92" r="20" />
          <path d="M70 120V56" />
          <path d="M70 56l28 11-28 11z" fill="currentColor" />
        </g>
      )}
      {tipo === "polo" && <Polo />}
    </svg>
  );
}

/** Dibujo de línea del polo con las dos posiciones de logo (maqueta, vía «En el pecho»). */
function Polo() {
  return (
    <g transform="translate(0 -10)">
      <path
        d="M70 32 L95 20 Q120 33 145 20 L170 32 L206 54 L193 86 L172 77 L172 182 Q120 191 68 182 L68 77 L47 86 L34 54 Z"
        fill="#FBFAF6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M95 20 L104 43 L120 31 L136 43 L145 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M120 31 V 64" stroke="currentColor" strokeWidth="1" />
      <circle cx="120" cy="45" r="1.6" fill="currentColor" />
      <circle cx="120" cy="56" r="1.6" fill="currentColor" />
      <rect x="77" y="66" width="36" height="17" rx="2" fill="none" stroke="#7A6331" strokeWidth="1.2" strokeDasharray="3 2.5" />
      <rect x="127" y="66" width="36" height="17" rx="2" fill="none" stroke="#7A6331" strokeWidth="1.2" strokeDasharray="3 2.5" />
      <text x="95" y="77.2" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="7" fontWeight="700" fill="currentColor">
        Trofeo
      </text>
      <text x="145" y="77.2" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="7" fontWeight="700" fill="currentColor">
        Tu marca
      </text>
    </g>
  );
}

/** Ilustración de fondo del Hero: curvas de nivel, contorno de green y trayectoria punteada. */
export function ArteHero() {
  return (
    <svg className="hero-art" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <path
          id="c1"
          d="M -82 -8 C -80 -52 -36 -84 10 -80 C 56 -76 90 -44 86 0 C 82 44 46 80 2 82 C -44 84 -84 36 -82 -8 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <path
          id="c2"
          d="M -90 6 C -86 -40 -48 -78 0 -74 C 52 -70 84 -30 88 12 C 92 54 50 86 4 80 C -40 74 -94 52 -90 6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
      </defs>
      <g transform="translate(930 420)">
        <use href="#c1" transform="rotate(-8) scale(4.4 3.6)" />
        <use href="#c2" transform="rotate(4) scale(3.7 3.0)" />
        <use href="#c1" transform="rotate(-2) scale(3.0 2.45)" />
        <use href="#c2" transform="rotate(10) scale(2.35 1.9)" />
        <use href="#c1" transform="rotate(-6) scale(1.7 1.35)" />
        <use href="#c2" transform="scale(1.05 .8)" />
      </g>
      <g transform="translate(140 690)">
        <use href="#c2" transform="rotate(12) scale(3.2 2.2)" />
        <use href="#c1" transform="rotate(4) scale(2.3 1.6)" />
        <use href="#c2" transform="scale(1.4 1)" />
      </g>
      <ellipse cx="930" cy="420" rx="74" ry="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="930" cy="420" rx="60" ry="34" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M150 700 Q 560 130 922 412" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.5 9" strokeLinecap="round" />
      <path d="M948 420 V 348" stroke="currentColor" strokeWidth="1.6" />
      <path d="M948 348 L 984 361 L 948 374 Z" fill="currentColor" />
      <ellipse cx="948" cy="421" rx="6" ry="2.6" fill="currentColor" />
    </svg>
  );
}

/** Iconos de los hoyos con concurso (maqueta). */
export function IconoConcurso({ concurso }: { concurso: "BOLA_MAS_CERCANA" | "DRIVE_MAS_LARGO" }) {
  if (concurso === "DRIVE_MAS_LARGO") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M5 33h6M8 33v-3" />
          <path d="M8 28 Q 21 1 36 22" strokeDasharray="1.5 3.2" />
        </g>
        <circle cx="8" cy="28.2" r="1.7" fill="currentColor" />
        <circle cx="36" cy="22" r="1.9" fill="#B49755" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <path d="M24 31V8" />
        <ellipse cx="24" cy="31" rx="4.5" ry="1.8" />
        <ellipse cx="24" cy="31" rx="10.5" ry="4.2" />
        <ellipse cx="24" cy="31" rx="16" ry="6.6" strokeDasharray="1.5 3" />
      </g>
      <path d="M24 8l9 3.5-9 3.5z" fill="#B49755" />
      <circle cx="14" cy="33" r="1.7" fill="currentColor" />
    </svg>
  );
}

/** Bola en el búnker / bola perdida: páginas de sistema. */
export function IconoSistema({ tipo }: { tipo: "perdida" | "bunker" }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <g {...trazo}>
        {tipo === "perdida" ? (
          <>
            <path d="M6 60c12-8 22-8 34 0s22 8 34 0" />
            <path d="M6 70c12-8 22-8 34 0s22 8 34 0" strokeDasharray="2 5" />
            <circle cx="52" cy="30" r="6" />
            <path d="M14 52 Q 30 10 46 28" strokeDasharray="1.5 5" />
          </>
        ) : (
          <>
            <path d="M8 58c10-14 54-14 64 0" />
            <path d="M14 60c8-8 44-8 52 0" strokeDasharray="2 5" />
            <circle cx="40" cy="50" r="6" />
            <path d="M58 46V14" />
            <path d="M58 14l14 5-14 5z" fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
}
