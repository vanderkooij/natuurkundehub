import { Maximize, Minus, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { WerkvlakContext } from "./context";
import {
  naarWerkvlak,
  passend,
  schuif,
  zoomRond,
  type Kijkvenster,
  type Rechthoek,
} from "./kijkvenster";

/** Afstand tussen de rasterstippen, in werkvlakeenheden. */
export const RASTER = 20;

interface Props {
  /** Deel van het werkvlak dat "passend" in beeld komt (bij openen en met de knop). */
  inhoud: Rechthoek;
  /** Een tik of sleep begint op de lege tafel (selectie opheffen). */
  onTafel?: () => void;
  /** Vaste laag boven het werkvlak, in schermcoördinaten (meldingen, knoppen). */
  bovenop?: ReactNode;
  /** Verandert deze waarde, dan komt de inhoud opnieuw passend in beeld (ander bord gekozen). */
  passendSleutel?: unknown;
  /** Krijgt een functie die het midden van het scherm geeft, in werkvlakcoördinaten. */
  middenRef?: React.MutableRefObject<() => { x: number; y: number }>;
  children?: ReactNode;
}

interface Aanwijzer {
  x: number;
  y: number;
}

/**
 * Het werkvlak: een oneindige tafel met raster waarop het bord en de modules
 * liggen. Schuiven door te slepen op een lege plek, zoomen met het wiel,
 * met twee vingers knijpen of met de knoppen rechtsonder.
 */
export function Werkvlak({
  inhoud,
  onTafel,
  bovenop,
  passendSleutel,
  middenRef,
  children,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [maat, setMaat] = useState({ b: 0, h: 0 });
  const [kijk, setKijk] = useState<Kijkvenster>({ x: 0, y: 0, schaal: 1 });
  const aanwijzers = useRef(new Map<number, Aanwijzer>());
  const eersteKeer = useRef(true);
  const inhoudRef = useRef(inhoud);
  inhoudRef.current = inhoud;

  // Schermmaat bijhouden; de eerste keer de inhoud passend zetten.
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const meet = () => {
      const r = el.getBoundingClientRect();
      setMaat({ b: r.width, h: r.height });
      if (eersteKeer.current && r.width > 0) {
        eersteKeer.current = false;
        setKijk(passend(inhoudRef.current, r.width, r.height, 24));
      }
    };
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lokaal = (e: { clientX: number; clientY: number }): Aanwijzer => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Alleen slepen op de lege tafel; modules en bussen vangen hun eigen kliks.
    if (
      e.target !== e.currentTarget &&
      !(e.target as Element).classList.contains("sb-tafel")
    )
      return;
    if (aanwijzers.current.size === 0) onTafel?.();
    svgRef.current!.setPointerCapture(e.pointerId);
    aanwijzers.current.set(e.pointerId, lokaal(e));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const a = aanwijzers.current;
    const oud = a.get(e.pointerId);
    if (!oud) return;
    const nieuw = lokaal(e);
    if (a.size === 1) {
      setKijk((k) => schuif(k, nieuw.x - oud.x, nieuw.y - oud.y));
    } else if (a.size === 2) {
      // Knijpen: zoomen rond het midden van beide vingers, en meeschuiven met dat midden.
      const ander = [...a.entries()].find(([id]) => id !== e.pointerId)![1];
      const afstandOud = Math.hypot(oud.x - ander.x, oud.y - ander.y);
      const afstandNieuw = Math.hypot(nieuw.x - ander.x, nieuw.y - ander.y);
      const mOud = { x: (oud.x + ander.x) / 2, y: (oud.y + ander.y) / 2 };
      const mNieuw = { x: (nieuw.x + ander.x) / 2, y: (nieuw.y + ander.y) / 2 };
      if (afstandOud > 0) {
        setKijk((k) =>
          schuif(
            zoomRond(k, afstandNieuw / afstandOud, mOud.x, mOud.y),
            mNieuw.x - mOud.x,
            mNieuw.y - mOud.y,
          ),
        );
      }
    }
    a.set(e.pointerId, nieuw);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    aanwijzers.current.delete(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = lokaal(e);
    // Vloeiend: een muiswiel geeft grote stappen, een touchpad veel kleine.
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
    setKijk((k) => zoomRond(k, factor, p.x, p.y));
  };

  const zoomKnop = useCallback(
    (factor: number) =>
      setKijk((k) => zoomRond(k, factor, maat.b / 2, maat.h / 2)),
    [maat],
  );
  const passendKnop = useCallback(
    () => setKijk(passend(inhoud, maat.b, maat.h, 24)),
    [inhoud, maat],
  );

  // Na een ander bord: opnieuw passend (niet bij het eerste tekenen, dat doet de meting).
  const vorigeSleutel = useRef(passendSleutel);
  useEffect(() => {
    if (vorigeSleutel.current === passendSleutel) return;
    vorigeSleutel.current = passendSleutel;
    if (maat.b > 0) setKijk(passend(inhoudRef.current, maat.b, maat.h, 24));
  }, [passendSleutel, maat]);

  if (middenRef)
    middenRef.current = () => naarWerkvlak(kijk, maat.b / 2, maat.h / 2);

  // Sneltoetsen + − 0, niet als er in een invoerveld getypt wordt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") zoomKnop(1.25);
      else if (e.key === "-") zoomKnop(1 / 1.25);
      else if (e.key === "0") passendKnop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomKnop, passendKnop]);

  // Raster groot genoeg om het hele zichtbare deel te bedekken.
  const zicht = {
    x: Math.floor(kijk.x / RASTER) * RASTER - RASTER,
    y: Math.floor(kijk.y / RASTER) * RASTER - RASTER,
    b: maat.b / kijk.schaal + 2 * RASTER,
    h: maat.h / kijk.schaal + 2 * RASTER,
  };

  const naarWerkvlakVanClient = useCallback(
    (clientX: number, clientY: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      return naarWerkvlak(kijk, clientX - r.left, clientY - r.top);
    },
    [kijk],
  );

  const knop =
    "grid h-11 w-11 place-items-center rounded-xl border border-(--border-solid) bg-card text-(--text-secondary) shadow-sm hover:bg-(--bg-card-hover)";

  return (
    <div className="relative min-h-0 flex-1">
      <svg
        ref={svgRef}
        className="sb-werkvlak absolute inset-0 h-full w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <pattern
            id="sb-raster"
            x={-1.5}
            y={-1.5}
            width={RASTER}
            height={RASTER}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1.5} cy={1.5} r={1.2} fill="var(--sb-raster)" />
          </pattern>
        </defs>
        <g transform={`scale(${kijk.schaal}) translate(${-kijk.x} ${-kijk.y})`}>
          <rect
            className="sb-tafel"
            x={zicht.x}
            y={zicht.y}
            width={zicht.b}
            height={zicht.h}
            fill="url(#sb-raster)"
          />
          <WerkvlakContext.Provider
            value={{ schaal: kijk.schaal, naarWerkvlak: naarWerkvlakVanClient }}
          >
            {children}
          </WerkvlakContext.Provider>
        </g>
      </svg>
      {bovenop}
      <div className="absolute right-3 bottom-3 flex flex-col gap-2">
        <button
          type="button"
          className={knop}
          onClick={() => zoomKnop(1.25)}
          aria-label="Inzoomen"
          title="Inzoomen (+)"
        >
          <Plus size={20} />
        </button>
        <button
          type="button"
          className={knop}
          onClick={() => zoomKnop(1 / 1.25)}
          aria-label="Uitzoomen"
          title="Uitzoomen (−)"
        >
          <Minus size={20} />
        </button>
        <button
          type="button"
          className={knop}
          onClick={passendKnop}
          aria-label="Alles in beeld"
          title="Alles in beeld (0)"
        >
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}
