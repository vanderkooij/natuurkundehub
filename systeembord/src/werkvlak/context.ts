import { createContext, useContext } from "react";

export interface WerkvlakInfo {
  /** Schermpixels per werkvlakeenheid. */
  schaal: number;
  /** Zet een schermpositie (clientX/Y van een muis- of aanraakgebeurtenis) om naar het werkvlak. */
  naarWerkvlak: (clientX: number, clientY: number) => { x: number; y: number };
}

export const WerkvlakContext = createContext<WerkvlakInfo>({
  schaal: 1,
  naarWerkvlak: (x, y) => ({ x, y }),
});

export const useWerkvlak = () => useContext(WerkvlakContext);
