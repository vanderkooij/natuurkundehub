import { describe, expect, it } from "vitest";

import { metExtensie } from "@/bestand/opslaan";

describe("bestandsnaam bij opslaan", () => {
  it("krijgt precies één keer de extensie", () => {
    expect(metExtensie("alarm")).toBe("alarm.systeembord.json");
    expect(metExtensie("alarm.json")).toBe("alarm.systeembord.json");
    expect(metExtensie("alarm.systeembord.json")).toBe(
      "alarm.systeembord.json",
    );
    expect(metExtensie("  ")).toBe("schakeling.systeembord.json");
  });
});
