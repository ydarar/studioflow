export interface ExportResult {
  expectedOutputPath?: string;
  note: string;
}

export async function resolveExportResult(runDir: string): Promise<ExportResult> {
  return {
    expectedOutputPath: undefined,
    note: `Screen Studio export triggered. Check configured export destination. Run artifacts: ${runDir}`
  };
}
