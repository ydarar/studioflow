import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadFlowFromFile } from "@studioflow/flow-registry";

const tempDirs: string[] = [];

async function writeFlowFile(profile: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-flow-pacing-"));
  tempDirs.push(dir);

  const filePath = path.join(dir, "flow.json");
  const flow = {
    id: "pacing-profile-check",
    description: "pacing profile check",
    tags: [],
    pacing: {
      profile,
      predictedDurationSec: 30,
      durationMultiplier: 1
    },
    steps: [
      {
        id: "goto-root",
        action: "goto",
        value: "/"
      }
    ]
  };

  await fs.writeFile(filePath, `${JSON.stringify(flow, null, 2)}\n`, "utf8");
  return filePath;
}

describe("flow pacing profile parsing", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("keeps canonical standard profile unchanged", async () => {
    const flowPath = await writeFlowFile("standard");
    const flow = await loadFlowFromFile(flowPath);

    expect(flow.pacing?.profile).toBe("standard");
  });

  it("rejects unsupported balanced profile", async () => {
    const flowPath = await writeFlowFile("balanced");
    await expect(loadFlowFromFile(flowPath)).rejects.toThrow("Invalid enum value");
  });
});
