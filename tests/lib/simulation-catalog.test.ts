import { describe, expect, it } from "vitest";

import { orderSimulationsByNewestEdition } from "../../lib/simulation-catalog";

describe("simulation catalog ordering", () => {
  it("shows official editions from newest to oldest", () => {
    const simulations = [
      { slug: "exame-27" },
      { slug: "exame-40" },
      { slug: "diagnostico-41" },
      { slug: "exame-36" },
      { slug: "exame-39" },
    ];

    expect(
      orderSimulationsByNewestEdition(simulations).map(
        (simulation) => simulation.slug,
      ),
    ).toEqual([
      "diagnostico-41",
      "exame-40",
      "exame-39",
      "exame-36",
      "exame-27",
    ]);
  });

  it("keeps custom simulations after numbered editions in their original order", () => {
    const simulations = [
      { slug: "revisao-etica" },
      { slug: "exame-38" },
      { slug: "intensivo-final" },
    ];

    expect(
      orderSimulationsByNewestEdition(simulations).map(
        (simulation) => simulation.slug,
      ),
    ).toEqual(["exame-38", "revisao-etica", "intensivo-final"]);
  });
});
