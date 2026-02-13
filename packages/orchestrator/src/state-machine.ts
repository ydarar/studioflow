export type EngineState =
  | "INIT"
  | "START_APP"
  | "START_RECORDER"
  | "RUN_FLOW"
  | "STOP_RECORDER"
  | "EXPORT"
  | "VERIFY_ARTIFACTS"
  | "DONE"
  | "FAILED";
