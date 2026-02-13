import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlowDefinition } from "@studioflow/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const projectConfigDir = path.join(rootDir, ".studioflow");
const projectConfigPath = path.join(projectConfigDir, "config.json");

const {
  loadFlowFromFileMock,
  runEngineMock,
  ensureAutomationPermissionsMock,
  activateScreenStudioMock,
  listRecordMenuItemsMock
} = vi.hoisted(() => ({
  loadFlowFromFileMock: vi.fn(),
  runEngineMock: vi.fn(),
  ensureAutomationPermissionsMock: vi.fn(),
  activateScreenStudioMock: vi.fn(),
  listRecordMenuItemsMock: vi.fn()
}));

vi.mock("@studioflow/flow-registry", () => ({
  loadFlowFromFile: loadFlowFromFileMock
}));

vi.mock("@studioflow/orchestrator", () => ({
  runEngine: runEngineMock
}));

vi.mock("@studioflow/adapters-desktop", () => ({
  ensureAutomationPermissions: ensureAutomationPermissionsMock
}));

vi.mock("@studioflow/adapters-screenstudio", () => ({
  activateScreenStudio: activateScreenStudioMock,
  listRecordMenuItems: listRecordMenuItemsMock
}));

function makeFlow(id: string): FlowDefinition {
  return {
    id,
    description: `${id} flow`,
    tags: [id],
    steps: [
      {
        id: "goto-root",
        action: "goto",
        value: "/"
      }
    ]
  };
}

describe.sequential("run command orchestration", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    loadFlowFromFileMock.mockReset();
    runEngineMock.mockReset();
    ensureAutomationPermissionsMock.mockReset();
    activateScreenStudioMock.mockReset();
    listRecordMenuItemsMock.mockReset();

    process.env = { ...originalEnv };
    process.env.INIT_CWD = rootDir;
    process.env.STUDIOFLOW_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-data-"));
    delete process.env.STUDIOFLOW_RUNS_DIR;

    await fs.rm(projectConfigDir, { recursive: true, force: true });

    ensureAutomationPermissionsMock.mockResolvedValue({
      screenStudioInstalled: true,
      canRunAppleScript: true,
      canSendKeystrokes: true,
      notes: []
    });
    activateScreenStudioMock.mockResolvedValue(undefined);
    listRecordMenuItemsMock.mockResolvedValue(["Record display", "Stop recording"]);

    loadFlowFromFileMock.mockResolvedValue(makeFlow("billing"));
    runEngineMock.mockResolvedValue({
      runId: "run-123",
      runDir: "/tmp/run-123",
      status: "success",
      startedAt: "2026-02-01T00:00:00.000Z",
      endedAt: "2026-02-01T00:00:10.000Z",
      files: {}
    });
  });

  afterEach(async () => {
    await fs.rm(projectConfigDir, { recursive: true, force: true });
    if (process.env.STUDIOFLOW_DATA_DIR) {
      await fs.rm(process.env.STUDIOFLOW_DATA_DIR, { recursive: true, force: true });
    }
    process.env = { ...originalEnv };
  });

  it("prefers explicit run overrides over bootstrap hints", async () => {
    const bootstrapDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-bootstrap-"));
    const bootstrapPath = path.join(bootstrapDir, "bootstrap.json");
    await fs.writeFile(
      bootstrapPath,
      JSON.stringify(
        {
          generatedAt: "2026-02-01T00:00:00.000Z",
          projectRoot: rootDir,
          packageManager: "pnpm",
          projectType: "nextjs",
          startCommand: "pnpm bootstrap-start",
          healthPath: "/bootstrap-health",
          notes: []
        },
        null,
        2
      ),
      "utf8"
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow", {
      bootstrapReportPath: bootstrapPath,
      baseUrl: "http://localhost:9999",
      startCommand: "pnpm flag-start",
      healthPath: "/flag-health",
      headless: true,
      runsDir: ".runs-from-flag"
    });

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Base URL: http://localhost:9999");
    expect(logged).toContain("Start command: pnpm flag-start");
    expect(logged).toContain("Health path: /flag-health");
    expect(logged).toContain("Headless: true");
    expect(logged).toContain("Runs dir: .runs-from-flag");
    expect(runEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:9999",
        headless: true
      })
    );
  });

  it("uses project config when explicit run overrides are absent", async () => {
    await fs.mkdir(projectConfigDir, { recursive: true });
    await fs.writeFile(
      projectConfigPath,
      JSON.stringify(
        {
          baseUrl: "http://localhost:4200",
          startCommand: "pnpm dev",
          healthPath: "/healthz",
          headless: true,
          runsDir: ".runs-local"
        },
        null,
        2
      ),
      "utf8"
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow");

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Base URL: http://localhost:4200");
    expect(logged).toContain("Start command: pnpm dev");
    expect(logged).toContain("Health path: /healthz");
    expect(logged).toContain("Headless: true");
    expect(logged).toContain("Runs dir: .runs-local");
  });

  it("uses bootstrap hints when config files are absent", async () => {
    const bootstrapDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-bootstrap-"));
    const bootstrapPath = path.join(bootstrapDir, "bootstrap.json");
    await fs.writeFile(
      bootstrapPath,
      JSON.stringify(
        {
          generatedAt: "2026-02-01T00:00:00.000Z",
          projectRoot: rootDir,
          packageManager: "pnpm",
          projectType: "nextjs",
          startCommand: "pnpm bootstrap-start",
          healthPath: "/bootstrap-health",
          notes: []
        },
        null,
        2
      ),
      "utf8"
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow", { bootstrapReportPath: bootstrapPath });

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Start command: pnpm bootstrap-start");
    expect(logged).toContain("Health path: /bootstrap-health");
  });

  it("falls back to default config when no files or overrides exist", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow", {
      bootstrapReportPath: path.join(rootDir, "does-not-exist-bootstrap.json")
    });

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Base URL: http://localhost:4173");
    expect(logged).toContain("Start command: (not configured)");
    expect(logged).toContain("Health path: /api/health");
    expect(logged).toContain("Headless: false");
    expect(logged).toContain("Runs dir: .runs");
  });

  it("fails fast on invalid flow definitions before orchestrator execution", async () => {
    loadFlowFromFileMock.mockResolvedValue({
      id: "broken",
      description: "invalid flow",
      tags: [],
      steps: [
        {
          id: "bad-click",
          action: "click"
        }
      ]
    });

    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await expect(runFlowFileCommand("artifacts/flow.json", "broken flow")).rejects.toThrow(
      "Flow broken failed validation: step[0] (bad-click): action click requires target"
    );
    expect(runEngineMock).not.toHaveBeenCalled();
  });

  it("resolves --flow paths from workspace root for runFlowFileCommand", async () => {
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow");

    expect(loadFlowFromFileMock).toHaveBeenCalledWith(path.join(rootDir, "artifacts/flow.json"));
    expect(runEngineMock).toHaveBeenCalledTimes(1);
  });

  it("throws usage error when flow path is missing", async () => {
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await expect(runFlowFileCommand("")).rejects.toThrow("Usage: studioflow run --flow <path/to/flow.json|yaml>");
  });
});
