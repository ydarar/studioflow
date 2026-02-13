import { describe, expect, it } from "vitest";
import { parseStartCommand } from "../../apps/cli/src/commands/run.ts";

describe("start command parsing", () => {
  it("parses quoted arguments for shell-free spawn", () => {
    expect(parseStartCommand('pnpm --filter "@studioflow/sample-app" run dev')).toEqual({
      command: "pnpm",
      args: ["--filter", "@studioflow/sample-app", "run", "dev"]
    });
  });

  it("treats shell metacharacters as literal args", () => {
    expect(parseStartCommand("pnpm dev && echo hacked")).toEqual({
      command: "pnpm",
      args: ["dev", "&&", "echo", "hacked"]
    });
  });

  it("supports escaped spaces", () => {
    expect(parseStartCommand("echo hello\\ world")).toEqual({
      command: "echo",
      args: ["hello world"]
    });
  });

  it("rejects malformed commands", () => {
    expect(() => parseStartCommand("")).toThrow("Start command is empty.");
    expect(() => parseStartCommand('"unterminated')).toThrow("Start command contains an unterminated quote.");
  });
});
